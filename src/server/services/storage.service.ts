import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Comprobantes de pago en Supabase Storage.
// Bucket PRIVADO: el navegador sube directo con una URL firmada de un solo
// uso (el archivo no pasa por Vercel) y se lee con URLs firmadas de corta
// vida — los comprobantes contienen datos bancarios.

export const RECEIPTS_BUCKET = "comprobantes";

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const RECEIPT_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg":      "jpg",
  "image/png":       "png",
  "image/webp":      "webp",
  "application/pdf": "pdf",
};

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  const raw = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw || !key) {
    throw new Error(
      "Supabase Storage no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  // Solo el origen (https://<proyecto>.supabase.co): descarta cualquier sufijo
  // como /rest/v1, /storage/v1 o barras finales. Un path extra hace que TODAS
  // las peticiones a Storage fallen con "Invalid path specified in request URL".
  let url: string;
  try {
    url = new URL(raw).origin;
  } catch {
    throw new Error("SUPABASE_URL no es una URL válida. Debe ser https://<proyecto>.supabase.co");
  }
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

// Crea el bucket privado si no existe (idempotente). Registra los buckets
// existentes para diagnóstico cuando algo no coincide.
async function ensureBucket(c: SupabaseClient) {
  const { data: buckets, error: listError } = await c.storage.listBuckets();
  if (listError) {
    console.error(`[storage] No se pudieron listar buckets: ${listError.message}`);
    return;
  }
  const names = buckets?.map((b) => b.name) ?? [];
  if (names.includes(RECEIPTS_BUCKET)) return;

  console.warn(`[storage] El bucket "${RECEIPTS_BUCKET}" no existe (buckets: [${names.join(", ")}]). Creándolo…`);
  const { error: createError } = await c.storage.createBucket(RECEIPTS_BUCKET, { public: false });
  if (createError && !/already exists/i.test(createError.message)) {
    console.error(`[storage] No se pudo crear el bucket "${RECEIPTS_BUCKET}": ${createError.message}`);
  }
}

/** URL firmada para que el cliente suba el archivo con un PUT directo. */
export async function createReceiptUploadUrl(path: string) {
  const c = getClient();

  let res = await c.storage.from(RECEIPTS_BUCKET).createSignedUploadUrl(path);

  // El fallo más común es que el bucket no exista: asegurarlo y reintentar
  if (res.error) {
    await ensureBucket(c);
    res = await c.storage.from(RECEIPTS_BUCKET).createSignedUploadUrl(path);
  }

  if (res.error || !res.data) {
    console.error(`[storage] Falló createSignedUploadUrl. bucket="${RECEIPTS_BUCKET}", path="${path}", error=${res.error?.message ?? "sin datos"}`);
    throw new Error(`No se pudo preparar la subida del comprobante: ${res.error?.message ?? "sin datos"}`);
  }
  return { uploadUrl: res.data.signedUrl, path: res.data.path };
}

/** URL firmada de lectura (5 minutos por defecto). */
export async function createReceiptViewUrl(path: string, expiresInSeconds = 300) {
  const c = getClient();
  const { data, error } = await c.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw new Error(`No se pudo generar el enlace del comprobante: ${error?.message ?? "sin datos"}`);
  }
  return data.signedUrl;
}
