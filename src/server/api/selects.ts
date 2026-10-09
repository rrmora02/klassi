/**
 * Campos de `User` que pueden viajar al cliente. Nunca devolver la fila completa:
 * incluye `clerkId`, `isSuperAdmin` y `activeTenantId` (id de otras escuelas).
 */
export const safeUserSelect = {
  id:     true,
  name:   true,
  email:  true,
  phone:  true,
  avatar: true,
} as const;
