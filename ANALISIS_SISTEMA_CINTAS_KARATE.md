# Análisis: Sistema de Cintas para Escuelas de Karate en Klassi

## 1. CONTEXTO ACTUAL

### Sistema actual de Klassi
```
GroupLevel (enum en Prisma):
├─ BEGINNER (Principiante)
├─ INTERMEDIATE (Intermedio)
├─ ADVANCED (Avanzado)
└─ PROFESSIONAL (Profesional)

Uso:
- Se asigna al GRUPO (no al alumno)
- Ejemplo: "Grupo Karate BEGINNER"
```

### Problema
- ❌ No permite múltiples niveles por alumno (historial)
- ❌ No permite cintas específicas (blanca, amarilla, negra, etc.)
- ❌ No permite subgrados (1er kyu, 2do kyu, etc.)
- ❌ No controla transiciones de nivel/cinta
- ❌ No registra fechas de cambio de cinta
- ❌ No permite exámenes de paso de nivel

---

## 2. SISTEMA DE CINTAS EN KARATE

### Estructura típica (Karate-Do tradicional)

```
KIHON (Técnica básica) - Cintas de color
├─ Blanca (Sin experiencia)
├─ Amarilla (10º kyu)
├─ Naranja (9º kyu)
├─ Verde (8º kyu)
├─ Azul (7º kyu)
├─ Marrón (6º-1er kyu) ← Puede tener 3 subgrados
│  ├─ Marrón 3er kyu
│  ├─ Marrón 2do kyu
│  └─ Marrón 1er kyu
└─ Negra (1er dan en adelante) ← Puede tener múltiples dan
   ├─ Negra 1er dan
   ├─ Negra 2do dan
   ├─ Negra 3er dan
   └─ Negra 10mo dan (máximo típico)

KATA (Formas) - Cintas paralelas
├─ Blanca
├─ Amarilla
└─ ...

KUMITE (Combate) - Cintas paralelas
├─ Blanca
├─ Amarilla
└─ ...
```

### Datos importantes de cada cinta

| Aspecto | Ejemplo |
|--------|---------|
| **Nombre** | Marrón / Negra |
| **Orden** | 6to nivel en progresión |
| **Kyu/Dan** | 1er kyu / 1er dan |
| **Color RGB** | #8B4513 (marrón) |
| **Requiere examen** | Sí |
| **Tiempo mínimo** | 3 meses desde última cinta |
| **Edad mínima** | 5+ años (depende escuela) |
| **Costo (opcional)** | $50 por examen |

---

## 3. ANÁLISIS DE CAMBIOS NECESARIOS

### 3.1 Base de Datos (Prisma Schema)

#### CAMBIO 1: Crear tabla de Cintas

```prisma
// Definición de nivel/cinta disponible en escuela
model Belt {
  id            String   @id @default(cuid())
  tenantId      String
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  
  // Información de la cinta
  name          String   // "Blanca", "Amarilla", "Negra"
  colorHex      String   // "#FFFFFF" para blanca
  order         Int      // 1 (primera) a N (última)
  
  // Kyu/Dan
  kyuDan        String?  // "10º kyu", "1er dan", "3er dan"
  isBlack       Boolean  @default(false) // true para negra y superiores
  danLevel      Int?     // null para kyu, 1-10 para dan
  kyuLevel      Int?     // 10-1 para kyu
  
  // Requisitos
  minimumMonths Int      @default(3) // Meses desde última cinta
  minimumAge    Int      @default(0) // Edad mínima en años
  requiresExam  Boolean  @default(true)
  examCost      Int?     // En centavos
  description   String?
  
  // Relaciones
  studentBelts  StudentBelt[]
  beltRequests  BeltRequest[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([tenantId, order])
  @@index([tenantId])
}

// Historial de cintas del alumno
model StudentBelt {
  id            String   @id @default(cuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  
  beltId        String
  belt          Belt     @relation(fields: [beltId], references: [id])
  
  // Cuándo obtuvo la cinta
  obtainedAt    DateTime
  
  // Examen (si aplica)
  examDate      DateTime?
  examPassed    Boolean?
  examScore     Int?     // 0-100
  examNotes     String?
  
  // Auditoría
  createdBy     String?  // clerkId del admin que registró
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([studentId, beltId]) // No puede tener duplicados
  @@index([studentId])
  @@index([beltId])
}

// Solicitud de cambio de cinta (workflow)
model BeltRequest {
  id            String   @id @default(cuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id])
  
  requestedBeltId String
  requestedBelt   Belt    @relation(fields: [requestedBeltId], references: [id])
  
  status        BeltRequestStatus @default(PENDING) // PENDING, APPROVED, REJECTED, EXAM_PASSED
  requestedAt   DateTime @default(now())
  
  // Examen
  examScheduled DateTime?
  examDate      DateTime?
  examPassed    Boolean?
  examScore     Int?
  examNotes     String?
  
  // Aprobación
  approvedBy    String?  // clerkId del admin
  approvedAt    DateTime?
  notes         String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([studentId])
  @@index([status])
}

enum BeltRequestStatus {
  PENDING        // Esperando examen
  EXAM_SCHEDULED // Examen programado
  EXAM_PENDING   // Examen realizado, esperando calificación
  EXAM_PASSED    // Examen pasado, esperando aprobación final
  APPROVED       // Aprobado, cinta asignada
  REJECTED       // Rechazado
  CANCELLED      // Cancelado por estudiante
}
```

#### CAMBIO 2: Actualizar tabla Student

```prisma
model Student {
  // ... campos existentes ...
  
  // Cintas
  currentBelt    Belt?             @relation("currentBelt", fields: [currentBeltId], references: [id])
  currentBeltId  String?
  
  beltHistory   StudentBelt[]
  beltRequests  BeltRequest[]
  
  // Nuevos campos
  beltsObtainedCount Int @default(0) // Para analytics
  lastBeltDate   DateTime?
}
```

---

### 3.2 UI/UX Cambios

#### Secciones nuevas en dashboard

```
1. GESTIÓN DE CINTAS (Admin)
   ├─ Configurar cintas disponibles por escuela
   │  └─ [Crear/editar/eliminar cintas]
   ├─ Ver solicitudes de cambio de cinta
   │  └─ [Pendientes, aprobadas, rechazadas]
   └─ Reportes
      └─ Alumnos por cinta, progresión, etc.

2. PERFIL DE ALUMNO
   ├─ Cinta actual (en grande, con color)
   ├─ Historial de cintas
   │  └─ Blanca (01/01/2023) → Amarilla (15/06/2023) → ...
   ├─ Solicitar cambio de cinta
   │  └─ [Botón solo si cumple requisitos]
   └─ Examen información
      └─ Próximo examen: 15/02/2024

3. ASISTENCIA / CLASES
   ├─ Filtrar por cinta
   ├─ Ver progreso de cinta en clase
   └─ Registrar mini-evaluaciones

4. REPORTES
   ├─ Distribución por cinta
   ├─ Tasa de progresión
   ├─ Estudiantes listos para examen
   └─ Ingresos por exámenes
```

---

### 3.3 Características nuevas necesarias

#### 1. Sistema de Solicitudes de Cambio de Cinta

```
FLUJO ACTUAL:
Admin marca cinta manualmente
└─ Sin control de requisitos
└─ Sin historial de decisiones
└─ Sin examen registrado

FLUJO PROPUESTO:
1. Estudiante solicita cambio
2. Sistema valida:
   - ¿Pasó tiempo mínimo?
   - ¿Tiene edad mínima?
   - ¿Es siguiente cinta en progresión?
3. Si pasa validaciones:
   - Admin programa examen
4. Admin registra resultado:
   - Aprobado → cinta asignada
   - No aprobado → esperar 1 mes más
```

#### 2. Calendario de exámenes

```
Vista: Próximos 30 días
├─ Exámenes programados
├─ Estudiantes por cinta a examinar
└─ Ingresos esperados
```

#### 3. Analytics

```
Panel de control:
├─ % Estudiantes por cinta
├─ Velocidad promedio de progresión
├─ Tasas de éxito en exámenes
├─ Ingresos por exámenes
└─ Proyecciones de progresión
```

---

## 4. CAMBIOS POR MÓDULO

### Módulo: ALUMNOS

**Cambios:**
```
- Agregar columna "Cinta actual"
- Agregar sub-sección "Historial de cintas"
- Agregar botón "Solicitar cambio de cinta"
- Filtros: por cinta, por estatus de solicitud
```

### Módulo: GRUPOS

**Cambios:**
```
- Eliminar GroupLevel (o deprecar)
- Agregar "Rango de cintas" en el grupo
  Ej: Grupo "Karate A" = Cintas blanca-verde
  Ej: Grupo "Karate B" = Cintas azul-negra
- Ver alumnos agrupados por cinta
```

### Módulo: ASISTENCIA

**Cambios:**
```
- Mostrar cinta del estudiante en cada clase
- Opcional: Registrar "mini-evaluaciones"
  (pequeño progreso dentro de la cinta)
```

### MÓDULO NUEVO: CINTAS / BELTS

```
Secciones:
1. Configurar cintas de escuela
   - Crear cintas disponibles
   - Definir requisitos por cinta
   - Definir costos de examen

2. Solicitudes pendientes
   - Revisar solicitudes
   - Programar exámenes
   - Registrar resultados

3. Historial de exámenes
   - Quién aprobó/reprobó
   - Fechas
   - Calificaciones

4. Reportes
   - Gráficos de progresión
   - Ingresos por exámenes
   - Estudiantes por cinta
```

---

## 5. IMPLEMENTACIÓN POR FASES

### FASE 1: Setup base (1-2 semanas)

**Objetivo:** Backend + API lista para gestionar cintas

```
[ ] Crear migrations Prisma
    [ ] Tabla Belt
    [ ] Tabla StudentBelt
    [ ] Tabla BeltRequest
    [ ] Actualizar Student

[ ] Crear tRPC procedures
    [ ] createBelt()
    [ ] updateBelt()
    [ ] deleteBelt()
    [ ] requestBeltChange()
    [ ] approveBeltRequest()
    [ ] rejectBeltRequest()
    [ ] getBeltHistory()

[ ] Crear RLS policies (Supabase)
    [ ] Admins ver/editar cintas de su escuela
    [ ] Estudiantes ver su historial
```

### FASE 2: UI Básica (2-3 semanas)

**Objetivo:** Admin puede gestionar cintas desde dashboard

```
[ ] Página: /dashboard/configuracion/cintas
    [ ] Listar cintas disponibles
    [ ] Crear/editar/eliminar cinta
    [ ] Vista previa visual (color de cinta)

[ ] Página: /dashboard/solicitudes-cintas
    [ ] Listar solicitudes pendientes
    [ ] Aprobar/rechazar
    [ ] Programar examen

[ ] Perfil de alumno: Agregar sección de cintas
    [ ] Cinta actual (visual grande)
    [ ] Historial (timeline)
    [ ] Botón "Solicitar cambio" (si aplica)
```

### FASE 3: Features avanzadas (2-3 semanas)

**Objetivo:** Flujo completo de exámenes + reportes

```
[ ] Flujo de examen
    [ ] Programar examen
    [ ] Registrar calificación
    [ ] Notificación al estudiante

[ ] Analytics
    [ ] Distribución por cinta (gráfico pie)
    [ ] Progresión por mes (gráfico línea)
    [ ] Tasa de éxito en exámenes

[ ] Integraciones
    [ ] Email: notificar examen
    [ ] Email: notificar aprobación/reprobación
    [ ] Pagos: registrar ingreso de examen
```

### FASE 4: Polish + Testing (1 semana)

```
[ ] UI/UX refinement
[ ] Testing con escuela piloto
[ ] Documentación
[ ] Capacitación
```

**Total estimado:** 6-8 semanas

---

## 6. PREGUNTAS DE DISEÑO IMPORTANTES

### Para validar con clientes de Karate:

1. **¿Múltiples sistemas de cintas?**
   - Algunos dojos tienen: Kihon (básico) + Kata + Kumite (combate)
   - ¿Cada uno con su propio sistema de cintas?
   - **Recomendación:** Por ahora solo 1 sistema. Agregar múltiples luego.

2. **¿Exámenes obligatorios?**
   - ¿Todo cambio de cinta requiere examen?
   - ¿O el instructor puede promocionar sin examen?
   - **Recomendación:** Hacer flexible en config.

3. **¿Tiempo de espera?**
   - ¿Cuántos meses entre cintas? (típico: 3-6 meses)
   - ¿Varía por cinta?
   - **Recomendación:** Configurable por cinta.

4. **¿Edad mínima?**
   - ¿Hay restricciones? (ej: no puede ser cinta negra <16 años)
   - **Recomendación:** Opcional, configurable.

5. **¿Subgrados?**
   - ¿Marrón tiene 3 subgrados (3-1)? ¿O es una sola cinta?
   - **Recomendación:** Tratarlos como cintas separadas en la tabla.

6. **¿Costo de examen?**
   - ¿Se cobra por examen? ¿Cuánto?
   - ¿Se integra con sistema de pagos?
   - **Recomendación:** Campo opcional, integrable con Stripe luego.

---

## 7. COMPARATIVA: KLASSI ACTUAL vs MEJORADO

| Funcionalidad | Actual | Propuesto |
|--------------|--------|-----------|
| Niveles por grupo | ✅ | ✅ |
| Historial de cintas | ❌ | ✅ |
| Sistema de cintas flexible | ❌ | ✅ |
| Solicitudes de cambio | ❌ | ✅ |
| Exámenes | ❌ | ✅ |
| Requisitos (tiempo, edad) | ❌ | ✅ |
| Reportes de progresión | ❌ | ✅ |
| Ingresos por exámenes | ❌ | ✅ |
| Notificaciones | ❌ | ✅ (fase 3) |

---

## 8. ARQUITECTURA DE DATOS

```
ESCUELA (Tenant)
├─ Configuración de cintas
│  ├─ Cinta 1: Blanca
│  ├─ Cinta 2: Amarilla
│  └─ Cinta N: Negra 10º dan
│
├─ GRUPO (Group)
│  ├─ "Karate Niños" (cintas blanca-verde)
│  ├─ "Karate Adultos" (cintas azul-negra)
│  └─ ESTUDIANTE (Student)
│     ├─ Cinta actual: Amarilla
│     ├─ Historial:
│     │  ├─ Blanca (01/2023)
│     │  ├─ Amarilla (06/2023)
│     │  └─ ...
│     └─ Solicitudes pendientes:
│        └─ Naranja (status: EXAM_SCHEDULED)
│
└─ EXÁMENES (BeltRequest)
   ├─ Juan: Amarilla → Naranja (APPROVED)
   ├─ María: Verde → Azul (PENDING)
   └─ Carlos: Azul → Marrón (EXAM_SCHEDULED)
```

---

## 9. EJEMPLO DE CONFIGURACIÓN

```json
{
  "tenantId": "escuela-123",
  "belts": [
    {
      "name": "Blanca",
      "order": 1,
      "colorHex": "#FFFFFF",
      "kyuDan": null,
      "minimumMonths": 0,
      "requiresExam": false
    },
    {
      "name": "Amarilla",
      "order": 2,
      "colorHex": "#FFD700",
      "kyuDan": "10º kyu",
      "minimumMonths": 3,
      "requiresExam": true,
      "examCost": 5000 // $50
    },
    {
      "name": "Negra",
      "order": 7,
      "colorHex": "#000000",
      "kyuDan": "1er dan",
      "minimumMonths": 12,
      "minimumAge": 16,
      "requiresExam": true,
      "examCost": 10000 // $100
    }
  ]
}
```

---

## 10. RECOMENDACIÓN FINAL

### ✅ IMPLEMENTAR

**Razones:**
1. **Diferenciador fuerte** - Klassi sería UNA DE LAS POCAS plataformas con sistema de cintas
2. **Múltiples escuelas de Karate** - Oportunidad de mercado clara
3. **Extensible** - Base para Judo, Taekwondo, Kung Fu, etc.
4. **Genera ingresos** - Rastrear exámenes pagos
5. **Engagement** - Los estudiantes verán su progresión clara

### 📊 Impacto

```
Mercado potencial:
- Escuelas de Karate: ~50,000+ en Latinoamérica
- Promedio: 50-100 estudiantes/escuela
- Si conquistas 1% = 500 escuelas = $30k/mes potencial

Si 200 escuelas × $50/mes = $10k/mes
```

### 🎯 Próximos pasos

1. **Validar con 3-5 escuelas de Karate**
   - ¿Les interesa?
   - ¿Qué configuración exacta?
   - ¿Dispuestos a pagar por feature?

2. **Prototipo funcional**
   - Phase 1-2 (configuración + UI básica)
   - Demo a escuelas

3. **Lanzamiento MVP**
   - Phase 3-4 (analytics, notificaciones)
   - Hacer caso de estudio

---

## Conclusión

**Implementar sistema de cintas es una oportunidad excelente** para Klassi. 

Convierte a Klassi de:
```
"Plataforma genérica de gestión escolar"
→
"Plataforma ESPECIALIZADA para artes marciales"
```

Esto es un salto importante en positioning y permite atacar verticales específicas (Karate, Judo, Taekwondo, etc.)

**Tiempo recomendado para MVP:** 6-8 semanas después de validación.
