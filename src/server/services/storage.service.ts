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

function getStorage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase Storage no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, y crea el bucket privado 'comprobantes'.",
    );
  }
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client.storage.from(RECEIPTS_BUCKET);
}

/** URL firmada para que el cliente suba el archivo con un PUT directo. */
export async function createReceiptUploadUrl(path: string) {
  const { data, error } = await getStorage().createSignedUploadUrl(path);
  if (error || !data) {
    // "Invalid path" / "Bucket not found" casi siempre = el bucket no existe
    // o está mal nombrado. Se registra para diagnóstico en el servidor.
    console.error(`[storage] Falló createSignedUploadUrl. bucket="${RECEIPTS_BUCKET}", path="${path}", error=${error?.message ?? "sin datos"}`);
    throw new Error(`No se pudo preparar la subida del comprobante: ${error?.message ?? "sin datos"}`);
  }
  return { uploadUrl: data.signedUrl, path: data.path };
}

/** URL firmada de lectura (5 minutos por defecto). */
export async function createReceiptViewUrl(path: string, expiresInSeconds = 300) {
  const { data, error } = await getStorage().createSignedUrl(path, expiresInSeconds);
  if (error || !data) {
    throw new Error(`No se pudo generar el enlace del comprobante: ${error?.message ?? "sin datos"}`);
  }
  return data.signedUrl;
}
