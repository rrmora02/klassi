import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.ATTENDANCE_TOKEN_SECRET ?? "";

export function generateAttendanceToken(eventPaymentId: string): string {
  if (!SECRET) throw new Error("ATTENDANCE_TOKEN_SECRET not configured");
  return createHmac("sha256", SECRET).update(eventPaymentId).digest("hex");
}

export function validateAttendanceToken(token: string, eventPaymentId: string): boolean {
  if (!SECRET) return false;
  const expected = createHmac("sha256", SECRET).update(eventPaymentId).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
