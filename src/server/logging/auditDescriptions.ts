import type { AuditAction } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
  PRESENT: "Presente",
  ABSENT: "Ausente",
  JUSTIFIED: "Justificado",
  LATE: "Tarde",
};

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
  let entityLabel = entity.toLowerCase();

  if (entity === "Payment") entityLabel = "pago";
  if (entity === "Student") entityLabel = "alumno";
  if (entity === "Attendance") entityLabel = "asistencia";

  if (action === "CREATE" || action === "DELETE") {
    // Manejo especial para asistencia
    if (entity === "Attendance" && newValues?.studentName) {
      const status = newValues.status ? (STATUS_LABELS[newValues.status] || newValues.status) : "";
      const groupName = newValues.groupName ? ` (${newValues.groupName})` : "";
      return `${actionLabel} ${entityLabel}: ${newValues.studentName} como ${status}${groupName}`;
    }
    return `${actionLabel} ${entityLabel}`;
  }

  if (action === "UPDATE" && newValues) {
    const changes: string[] = [];

    if (newValues.status && oldValues?.status) {
      const oldLabel = STATUS_LABELS[oldValues.status] || oldValues.status;
      const newLabel = STATUS_LABELS[newValues.status] || newValues.status;
      changes.push(`estado: ${oldLabel} → ${newLabel}`);
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

    // Manejo especial para asistencia
    if (entity === "Attendance" && newValues.studentName && newValues.status) {
      const oldStatus = oldValues?.status ? (STATUS_LABELS[oldValues.status] || oldValues.status) : "";
      const newStatus = STATUS_LABELS[newValues.status] || newValues.status;
      const groupName = newValues.groupName ? ` (${newValues.groupName})` : "";
      return `${actionLabel} asistencia: ${newValues.studentName} de ${oldStatus} a ${newStatus}${groupName}`;
    }

    if (changes.length > 0) {
      return `${actionLabel} ${entityLabel}: ${changes.join(", ")}`;
    }
    return `${actionLabel} ${entityLabel}`;
  }

  return `${actionLabel} ${entityLabel}`;
}
