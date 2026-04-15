import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/server/db";

// ─── Tipos de eventos de Clerk ────────────────────────────────────

interface ClerkUserData {
  id:                  string;
  email_addresses:     { email_address: string; id: string }[];
  primary_email_address_id: string;
  first_name:          string | null;
  last_name:           string | null;
  image_url?:          string;
}

interface ClerkEvent {
  type: string;
  data: ClerkUserData;
}

// ─── Manejadores de eventos ───────────────────────────────────────

/**
 * user.created
 * Registra al usuario en la base de datos local cuando se registra en Clerk
 */
async function handleUserCreated(data: ClerkUserData) {
  const emailObj = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
  const email = emailObj?.email_address || data.email_addresses[0]?.email_address || "no-email@klassi.io";
  
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

  // Evitar duplicados (idempotencia)
  const existing = await db.user.findUnique({ where: { clerkId: data.id } });
  if (existing) {
    console.log(`[clerk-webhook] Usuario ${email} ya existe`);
    return;
  }

  const user = await db.user.create({
    data: {
      clerkId: data.id,
      email,
      name,
      avatar: data.image_url ?? null,
    },
  });

  console.log(`[clerk-webhook] Usuario creado: ${user.name} (${user.email})`);
}

/**
 * user.updated
 * Sincroniza cambios básicos de perfil (nombre, foto)
 */
async function handleUserUpdated(data: ClerkUserData) {
  const emailObj = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
  const email = emailObj?.email_address;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ");

  await db.user.updateMany({
    where: { clerkId: data.id },
    data: {
      ...(email && { email }),
      ...(name && { name }),
      ...(data.image_url && { avatar: data.image_url }),
    },
  });

  console.log(`[clerk-webhook] Usuario actualizado: ${data.id}`);
}

/**
 * user.deleted
 * Elimina o desactiva la cuenta
 */
async function handleUserDeleted(data: { id: string }) {
  await db.user.deleteMany({
    where: { clerkId: data.id },
  });

  console.log(`[clerk-webhook] Usuario eliminado: ${data.id}`);
}

// ─── Handler principal ────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  try {
    switch (event.type) {
      case "user.created":
        await handleUserCreated(event.data as ClerkUserData);
        break;
      case "user.updated":
        await handleUserUpdated(event.data as ClerkUserData);
        break;
      case "user.deleted":
        await handleUserDeleted(event.data as any);
        break;
      default:
        console.log(`[clerk-webhook] Evento ignorado: ${event.type}`);
    }
  } catch (err) {
    console.error(`[clerk-webhook] Error procesando ${event.type}:`, err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
