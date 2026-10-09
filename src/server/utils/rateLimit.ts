/**
 * Límite de tasa de ventana fija, en memoria.
 *
 * Mejor esfuerzo: en serverless cada instancia lleva su propio contador, así que
 * frena ráfagas y abuso desde un mismo cliente, pero no es un tope global. Para un
 * límite global compartido hay que mover el contador a un almacén común (Upstash/Redis);
 * la firma de `rateLimit` está pensada para que ese cambio no toque a los llamadores.
 */
interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** IP del cliente tras el proxy de Vercel; "unknown" si no viene ninguna cabecera. */
export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}
