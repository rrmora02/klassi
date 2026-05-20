# 🔴 Diagnóstico de Performance - Klassi

## Problemas Críticos Identificados

### 1. **PROBLEMA CRÍTICO: CreatedAt de ClassSession en cada navegación**
**Ubicación:** `attendance.ts:getSessionRoster` (línea 83-90)
**Severidad:** 🔴 CRÍTICA

Cada vez que cambias de fecha en asistencia, se crea una nueva `classSession` si no existe.
- Esto causa muchas escrituras en BD innecesarias
- Cada navegación a una nueva fecha = 1 write a la BD
- En una escuela con 7 días × múltiples grupos = MUCHAS writes diarias

**Solución sugerida:**
- No crear `classSession` automáticamente
- O crear las sesiones en batch al inicio del mes
- O usar lazy loading con caché

---

### 2. **N+1 Queries en Asistencia**
**Ubicación:** `attendance.ts:getSessionRoster` (línea 94-101)
**Severidad:** 🟠 ALTA

```typescript
const enrollments = await db.enrollment.findMany({
  where: { groupId: input.groupId, status: "ACTIVE" },
  include: {
    student: { select: { id, firstName, lastName, avatarUrl } }, // ← INNER JOIN
    attendances: { where: { sessionId: session.id } }           // ← Sub-query
  }
})
```

**Problema:**
- Por cada alumno hace un SELECT en attendances
- Si hay 30 alumnos = 30 sub-queries
- SIN índice en (groupId, status) = scan completo de tabla

---

### 3. **Índices Faltantes en Base de Datos**
**Severidad:** 🟠 ALTA

Faltan índices compuestos para:

```prisma
// En Enrollment
model Enrollment {
  // ← FALTA: @@index([groupId, status])
  // ← FALTA: @@index([studentId, status])
}

// En ClassSession
model ClassSession {
  // ← FALTA: @@index([groupId, date])
}

// En Student (para ordenamiento)
model Student {
  // ← FALTA: @@index([updatedAt]) DESC
  // ← FALTA: @@index([tenantId, updatedAt])
}

// En Group (para ordenamiento)
model Group {
  // ← FALTA: @@index([updatedAt]) DESC
  // ← FALTA: @@index([tenantId, updatedAt])
}
```

---

### 4. **getStudentBelts - Query Innecesaria**
**Ubicación:** `attendance-client.tsx` (línea 20-23)
**Severidad:** 🟡 MEDIA

Se dispara cada vez que cambias la fecha, aunque los estudiantes sean los mismos.

**Actual:**
```typescript
const { data: studentBelts = {} } = api.students.getStudentBelts.useQuery(
  { studentIds: rosterData?.enrollments?.map(e => e.student.id) || [] },
  { enabled: !!rosterData?.isKarate && (rosterData?.enrollments?.length || 0) > 0 }
);
```

**Problema:** 
- Se re-fetch si `rosterData` cambia (aunque sean los mismos alumnos)
- Debería cachear por grupo

---

### 5. **getGroups - Filtrado en JavaScript**
**Ubicación:** `attendance.ts:getGroups` (línea 41-46)
**Severidad:** 🟡 MEDIA

Obtiene TODOS los grupos y filtra en JavaScript.

```typescript
// Obtiene todos los grupos...
let groups = await ctx.db.group.findMany({...})

// ...luego filtra en JavaScript
if (dayOfWeek && Array.isArray(groups)) {
  groups = groups.filter(group => {
    const schedule = Array.isArray(group.schedule) ? group.schedule : [];
    return schedule.some((slot: any) => slot.day === dayOfWeek);
  });
}
```

**Mejor:** Filtrar en la query de Prisma o usar índice en schedule JSON.

---

### 6. **Ordenamiento por updatedAt sin índice**
**Ubicación:** `students.ts:list` y `groups.ts:list`
**Severidad:** 🟡 MEDIA

```typescript
orderBy: [{ updatedAt: "desc" }, { lastName: "asc" }]
```

Sin índice en `updatedAt`, esto hace un full table scan en cada listado.

---

## Impacto en Navegación

**Flujo actual cuando navegas a Asistencia:**
1. `getGroups()` → SELECT * FROM groups (SIN filtro)
2. Cambias fecha → crea `classSession` (WRITE)
3. `getSessionRoster()` → SELECT enrollments + 30 sub-queries attendances
4. `getStudentBelts()` → SELECT * FROM students WHERE id IN (...)

**Total:** ~35 queries + 1 write = LENTO

---

## Recomendaciones Inmediatas

### 🔥 URGENTE (implementar ya):
1. **Agregar índices compuestos** en Prisma
2. **Remover creación automática de ClassSession** o cachearla
3. **Cachear getStudentBelts** por grupo

### 🟡 IMPORTANTE (próxima semana):
4. Optimizar getSessionRoster (uso de joins más eficientes)
5. Filtrar getGroups en servidor (no en cliente)
6. Cachear queries con 5min TTL

### 📊 MONITOREAR:
- Tiempo de carga en asistencia
- Query count en cada página
- DB connection pool usage

---

## Archivos a Modificar

```
URGENTE:
- prisma/schema.prisma (agregar índices)
- src/server/api/routers/attendance.ts (remover auto-creation de session)

IMPORTANTE:
- src/components/asistencia/attendance-client.tsx (cachear getStudentBelts)
- src/server/api/routers/students.ts (índice para updatedAt)
- src/server/api/routers/groups.ts (índice para updatedAt)
```

---

## Timeline Recomendado

**Hoy:** Agregar índices + remover ClassSession auto-creation
**Mañana:** Optimizar queries
**Esta semana:** Agregar caching

Esto debería resolver 80% del problema de lentitud.
