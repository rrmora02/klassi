import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/server/db";

// ─── Tipos de eventos de Clerk ────────────────────────────────────

interface ClerkOrganizationData {
  id:          string;
  name:        string;
  slug:        string;
  image_url?:  string;
  created_at:  number;
}

interface ClerkUserData {
  id:                  string;
  email_addresses:     { email_address: string; id: string }[];
  primary_email_address_id: string;
  first_name:          string | null;
  last_name:           string | null;
  image_url?:          string;
}

interface ClerkMembershipData {
  id:           string;
  role:         "org:admin" | "org:member";
  organization: ClerkOrganizationData;
  public_user_data: {
    user_id:     string;
    first_name:  string | null;
    last_name:   string | null;
    image_url?:  string;
    identifier:  string; // email
  };
}

interface ClerkEvent {
  type: string;
  data: ClerkOrganizationData | ClerkUserData | ClerkMembershipData;
}

// ─── Mapeo de roles Clerk → roles internos ────────────────────────

const ROLE_MAP: Record<string, "ADMIN" | "RECEPTIONIST" | "INSTRUCTOR" | "PARENT"> = {
  "org:admin":  "ADMIN",
  "org:member": "RECEPTIONIST",
};

// ─── Utilidades ───────────────────────────────────────────────────

/** Convierte el nombre de la escuela en un slug válido para subdominio */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // elimina acentos
    .replace(/[^a-z0-9\s-]/g, "")     // solo alfanuméricos
    .replace(/\s+/g, "-")             // espacios → guiones
    .replace(/-+/g, "-")              // guiones dobles → uno
    .slice(0, 48);                    // máximo 48 chars
}

/** Garantiza que el slug sea único añadiendo un sufijo numérico si es necesario */
async function uniqueSlug(base: string): Promise<string> {
  let slug    = base;
  let attempt = 0;
  while (await db.tenant.findFirst({ where: { slug } })) {
    attempt++;
    slug = `${base}-${attempt}`;
  }
  return slug;
}

// ─── Manejadores de eventos ───────────────────────────────────────

/**
 * organization.created
 * Se dispara cuando una escuela completa el onboarding y crea su organización en Clerk.
 * Crea el Tenant en la BD con estado TRIAL por 14 días.
 */
async function handleOrganizationCreated(data: ClerkOrganizationData) {
  // Verificar que no exista ya (idempotencia)
  const existing = await db.tenant.findFirst({ where: { clerkOrgId: data.id } });
  if (existing) {
    console.log(`[clerk-webhook] Tenant ya existe para orgId ${data.id} — ignorando`);
    return;
  }

  const baseSlug     = toSlug(data.slug || data.name);
  const slug         = await uniqueSlug(baseSlug);
  const trialEndsAt  = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 días

  const tenant = await db.tenant.create({
    data: {
      clerkOrgId:  data.id,
      name:        data.name,
      slug,
      logo:        data.image_url ?? null,
      plan:        "STARTER",
      status:      "TRIAL",
      trialEndsAt,
    },
  });

  // Disciplinas de ejemplo para que la escuela no quede vacía
  await db.discipline.createMany({
    data: [
      {
        tenantId:       tenant.id,
        name:           "General",
        description:    "Disciplina por defecto",
        color:          "#378ADD",
        isActive:       true,
        extraFieldsDef: [],
        sortOrder:      0,
      },
    ],
  });

  console.log(`[clerk-webhook] Tenant creado: ${tenant.name} (${tenant.id}) — trial hasta ${trialEndsAt.toISOString()}`);
}

/**
 * organization.updated
 * Sincroniza nombre y logo cuando la escuela edita su perfil en Clerk.
 */
async function handleOrganizationUpdated(data: ClerkOrganizationData) {
  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: data.id } });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data:  {
      name: data.name,
      ...(data.image_url && { logo: data.image_url }),
    },
  });

  console.log(`[clerk-webhook] Tenant actualizado: ${data.name}`);
}

/**
 * organization.deleted
 * Marca el tenant como CANCELLED. No elimina datos (soft delete vía status).
 */
async function handleOrganizationDeleted(data: ClerkOrganizationData) {
  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: data.id } });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data:  { status: "CANCELLED" },
  });

  console.log(`[clerk-webhook] Tenant cancelado: ${data.name}`);
}

/**
 * organizationMembership.created
 * Crea (o reactiva) el User en la BD con el rol correspondiente.
 * Se dispara cuando alguien se une a una organización.
 */
async function handleMembershipCreated(data: ClerkMembershipData) {
  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: data.organization.id } });
  if (!tenant) {
    console.warn(`[clerk-webhook] Membership sin tenant para orgId ${data.organization.id}`);
    return;
  }

  const role  = ROLE_MAP[data.role] ?? "RECEPTIONIST";
  const email = data.public_user_data.identifier;
  const name  = [data.public_user_data.first_name, data.public_user_data.last_name]
    .filter(Boolean).join(" ") || email;

  // Upsert: si el usuario ya existe en otro tenant no lo pisa
  const existing = await db.user.findFirst({
    where: { clerkId: data.public_user_data.user_id, tenantId: tenant.id },
  });

  if (existing) {
    // Reactivar si estaba inactivo (p.ej. fue removido y volvió a unirse)
    await db.user.update({
      where: { id: existing.id },
      data:  { role, name },
    });
    console.log(`[clerk-webhook] Usuario reactivado: ${email} en ${tenant.name}`);
    return;
  }

  const user = await db.user.create({
    data: {
      clerkId:  data.public_user_data.user_id,
      tenantId: tenant.id,
      role,
      email,
      name,
      avatar:   data.public_user_data.image_url ?? null,
    },
  });

  // Si es el primer admin, crear el registro Instructor vinculado
  if (role === "ADMIN") {
    console.log(`[clerk-webhook] Admin creado: ${user.name} en ${tenant.name}`);
  }

  console.log(`[clerk-webhook] Usuario creado: ${user.name} (${role}) en ${tenant.name}`);
}

/**
 * organizationMembership.updated
 * Actualiza el rol si el admin cambia permisos dentro de Clerk.
 */
async function handleMembershipUpdated(data: ClerkMembershipData) {
  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: data.organization.id } });
  if (!tenant) return;

  const role = ROLE_MAP[data.role] ?? "RECEPTIONIST";

  await db.user.updateMany({
    where: { clerkId: data.public_user_data.user_id, tenantId: tenant.id },
    data:  { role },
  });

  console.log(`[clerk-webhook] Rol actualizado: ${data.public_user_data.identifier} → ${role}`);
}

/**
 * organizationMembership.deleted
 * No elimina el usuario — solo lo desvincula del tenant (tenantId → null).
 * Preserva historial de asistencia y pagos que creó.
 */
async function handleMembershipDeleted(data: ClerkMembershipData) {
  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: data.organization.id } });
  if (!tenant) return;

  // Soft-remove: mantenemos el registro pero sin tenantId activo
  // Usamos un campo deletedAt implícito seteando role a un valor inerte
  // En producción se puede agregar un campo `deletedAt` al modelo User
  await db.user.updateMany({
    where: { clerkId: data.public_user_data.user_id, tenantId: tenant.id },
    data:  { tenantId: null },
  });

  console.log(`[clerk-webhook] Usuario removido de ${tenant.name}: ${data.public_user_data.identifier}`);
}

// ─── Handler principal ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Verificar firma de Svix (Clerk usa Svix para firmar webhooks)
  const payload   = await req.text();
  const svixId        = req.headers.get("svix-id")        ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const svixSignature = req.headers.get("svix-signature") ?? "";

  if (!process.env.CLERK_WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
  let event: ClerkEvent;

  try {
    event = wh.verify(payload, {
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch (err) {
    console.error("[clerk-webhook] Firma inválida:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 2. Despachar al manejador correspondiente
  try {
    switch (event.type) {
      case "organization.created":
        await handleOrganizationCreated(event.data as ClerkOrganizationData);
        break;
      case "organization.updated":
        await handleOrganizationUpdated(event.data as ClerkOrganizationData);
        break;
      case "organization.deleted":
        await handleOrganizationDeleted(event.data as ClerkOrganizationData);
        break;
      case "organizationMembership.created":
        await handleMembershipCreated(event.data as ClerkMembershipData);
        break;
      case "organizationMembership.updated":
        await handleMembershipUpdated(event.data as ClerkMembershipData);
        break;
      case "organizationMembership.deleted":
        await handleMembershipDeleted(event.data as ClerkMembershipData);
        break;
      default:
        // Eventos no manejados — loguear y responder OK para que Clerk no reintente
        console.log(`[clerk-webhook] Evento no manejado: ${event.type}`);
    }
  } catch (err) {
    console.error(`[clerk-webhook] Error procesando ${event.type}:`, err);
    // Retornar 500 para que Clerk reintente el webhook
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
