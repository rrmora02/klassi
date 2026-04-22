import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea centavos a string de moneda: 9900 → "$99.00" */
export function formatCurrency(cents: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style:    "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Formatea fecha a string legible: "12 ene 2026" */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  }).format(new Date(date));
}

/** Nombre completo de alumno/usuario */
export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

/** Iniciales para avatars */
export function initials(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/** Calcula la edad a partir de fecha de nacimiento */
export function calcAge(birthDate: Date | string | null | undefined): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** Traduce estado de pago al español */
export function translatePaymentStatus(status: string): string {
  const translations: Record<string, string> = {
    PAID: "Pagado",
    PENDING: "Pendiente",
    OVERDUE: "Vencido",
    CANCELLED: "Cancelado",
  };
  return translations[status] ?? status;
}
