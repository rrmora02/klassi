import type { AuditAction } from "@prisma/client";

export function createAuditDescription(
  action: AuditAction,
  entity: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): string {
  const actionLabels: Record<AuditAction, string> = {
    CREATE: "Creó",
    UPDATE: "Actualizó",
    DELETE: "Eliminó",
    VIEW: "Visualizó",
    EXPORT: "Exportó",
  };

  const actionLabel = actionLabels[action];
  const entityLabel = entity === "Payment" ? "pago" : entity === "Student" ? "alumno" : entity.toLowerCase();

  if (action === "CREATE" || action === "DELETE") {
    return `${actionLabel} ${entityLabel}`;
  }

  if (action === "UPDATE" && newValues) {
    const changes: string[] = [];

    if (newValues.status && oldValues?.status) {
      changes.push(`estado: ${oldValues.status} → ${newValues.status}`);
    }
    if (newValues.amount && oldValues?.amount && newValues.amount !== oldValues.amount) {
      changes.push(`monto: $${(oldValues.amount / 100).toFixed(2)} → $${(newValues.amount / 100).toFixed(2)}`);
    }
    if (newValues.discountAmount && oldValues?.discountAmount !== newValues.discountAmount) {
      changes.push(`descuento: $${(oldValues?.discountAmount || 0) / 100} → $${(newValues.discountAmount / 100).toFixed(2)}`);
    }
    if (newValues.concept && oldValues?.concept !== newValues.concept) {
      changes.push(`concepto: "${oldValues?.concept}" → "${newValues.concept}"`);
    }
    if (newValues.method && oldValues?.method !== newValues.method) {
      changes.push(`método: ${oldValues?.method} → ${newValues.method}`);
    }
    if (newValues.reference && oldValues?.reference !== newValues.reference) {
      changes.push(`referencia: "${oldValues?.reference || "-"}" → "${newValues.reference}"`);
    }
    if (newValues.firstName && oldValues?.firstName !== newValues.firstName) {
      changes.push(`nombre: "${oldValues?.firstName}" → "${newValues.firstName}"`);
    }
    if (newValues.lastName && oldValues?.lastName !== newValues.lastName) {
      changes.push(`apellido: "${oldValues?.lastName}" → "${newValues.lastName}"`);
    }

    if (changes.length > 0) {
      return `${actionLabel} ${entityLabel}: ${changes.join(", ")}`;
    }
    return `${actionLabel} ${entityLabel}`;
  }

  return `${actionLabel} ${entityLabel}`;
}
