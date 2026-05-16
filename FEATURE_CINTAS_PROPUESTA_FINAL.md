# Feature Cintas: Propuesta Final Mejorada

## ANÁLISIS COMPARATIVO

### Propuesta Inicial (Mi análisis)

✅ **Fortalezas:**
- Sistema modular y escalable
- Modelo de datos completo (Belt, StudentBelt, BeltRequest)
- Flujo de solicitudes y aprobaciones
- Analytics y reportes

⚠️ **Debilidades:**
- ❌ NO integra asistencia automáticamente
- ❌ NO menciona alertas de elegibilidad
- ❌ NO resetea contador de asistencias
- ❌ NO archiva automáticamente historial
- ❌ Flujo manual vs automatizado
- ⚠️ Enfoque en "solicitud" en lugar de automatización

---

### Tu Descripción (User Stories)

✅ **Fortalezas:**
- ✅ Automatización basada en ASISTENCIA (clave)
- ✅ Alerta visual clara (badge "Elegible")
- ✅ Integración con Eventos de Examen
- ✅ Reseteo automático de asistencias
- ✅ Archivado automático de historial
- ✅ Preselección automática para examen
- ✅ Integración con módulo de asistencia existente

⚠️ **Debilidades:**
- ⚠️ No menciona analytics detallados
- ⚠️ No menciona configuración flexible por cinta
- ⚠️ No detalla UI/UX específicamente
- ⚠️ No menciona manejo de reprobación

---

## PROPUESTA FINAL MEJORADA

Combina lo mejor de ambas y agrega mejoras:

### 1. CONFIGURACIÓN DE CINTAS (Admin)

**Lo que el admin configura:**

```
Para cada cinta (Cinturón):
├─ Información básica
│  ├─ Nombre: "Cinturón Amarillo"
│  ├─ Color: #FFD700
│  ├─ Orden: 2 (en progresión)
│  ├─ Kyu/Dan: "10º kyu" (opcional)
│  └─ Descripción (opcional)
│
├─ Requisitos para OBTENER esta cinta
│  ├─ Asistencia mínima: 24 clases (desde última cinta)
│  ├─ Tiempo mínimo: 3 meses (desde última cinta)
│  ├─ Edad mínima: 5 años (opcional)
│  └─ Requisitos previos: (opcional, ej: "Debe dominar Kata X")
│
├─ Examen
│  ├─ ¿Requiere examen?: SÍ
│  ├─ Costo examen: $50 (opcional)
│  ├─ Duración estimada: 30 minutos
│  └─ Temas a evaluar: (opcional)
│
└─ Transición automática
   ├─ Al aprobar examen: ¿resetear contador asistencia?: SÍ
   ├─ Al aprobar examen: ¿archivar grado anterior?: SÍ
   └─ Notificación al estudiante: SÍ
```

---

### 2. SEGUIMIENTO AUTOMÁTICO DE ELEGIBILIDAD

**Sistema automático que calcula:**

```
PARA CADA ALUMNO:
└─ Cinta actual: Blanca (obtenida: 01/01/2023)
   ├─ Próxima cinta objetivo: Amarillo
   ├─ Requisitos:
   │  ├─ Asistencias necesarias: 24
   │  ├─ Asistencias actuales: 22 ← En tiempo real desde módulo Asistencia
   │  ├─ Falta: 2 clases
   │  ├─ Tiempo mínimo requerido: 3 meses (desde 01/01/2023)
   │  ├─ Tiempo actual: 5 meses ✅
   │  └─ Fecha más temprana elegible: TBD (cuando tenga 24 asistencias)
   │
   └─ ESTADO ELEGIBILIDAD:
      ├─ Caso A: No listo (falta asistencia)
      │  └─ Badge: ⚪ "Falta 2 clases" (gris)
      │
      ├─ Caso B: Listo para examen ✅
      │  └─ Badge: 🟢 "Elegible para Examen" (verde) ← DESTACADO
      │     Botón: [Preseleccionar para próximo examen]
      │
      └─ Caso C: Examen programado
         └─ Badge: 🟡 "Examen: 15/02/2024" (amarillo)
```

---

### 3. FLUJO DE EXAMEN AUTOMÁTICO

**Cuando profesor registra resultado:**

```
ESCENARIO: Examen de Cinturón (Evento)
├─ Profesor ingresa:
│  ├─ Alumno: "Juan"
│  ├─ Resultado: "APROBADO" ✅
│  ├─ Calificación: 85/100
│  └─ Fecha: 15/02/2024
│
└─ Sistema ejecuta AUTOMÁTICAMENTE:
   ├─ 1. Actualizar cinta actual
   │   └─ Juan: Blanca → Amarillo
   │
   ├─ 2. Archivar grado anterior
   │   └─ Historial: Blanca (01/01/2023 - 15/02/2024)
   │
   ├─ 3. RESETEAR contador de asistencias
   │   └─ Juan: 22 asistencias → 0 asistencias (nuevo grado)
   │
   ├─ 4. Crear nuevo "StudentBelt" para Amarillo
   │   └─ Juan: Amarillo (desde 15/02/2024)
   │
   ├─ 5. Registrar examen
   │   └─ Exam record: Juan, Blanca→Amarillo, 85/100, APROBADO
   │
   ├─ 6. Enviar notificación
   │   └─ Email a estudiante: "¡Felicitaciones! Eres Cinturón Amarillo"
   │
   └─ 7. Generar ingreso (si aplica)
      └─ Pago: $50 (si costo de examen)

ESCENARIO ALTERNATIVO: REPROBADO ❌
├─ Profesor ingresa:
│  ├─ Resultado: "NO APROBADO"
│  └─ Fecha: 15/02/2024
│
└─ Sistema ejecuta:
   ├─ Registrar intento fallido
   ├─ NO cambiar cinta
   ├─ NO resetear asistencias
   ├─ Crear "BeltAttempt" record con feedback
   ├─ Mostrar: "Puedes reintentar en 1 mes"
   └─ Email: "Necesitas más práctica en X. Próximo intento: 15/03/2024"
```

---

## 4. MODELO DE DATOS MEJORADO

```prisma
// NUEVA TABLA: Configuración de Cintas
model BeltGrade {
  id                  String   @id @default(cuid())
  tenantId            String
  tenant              Tenant   @relation(fields: [tenantId], references: [id])
  
  // Información de la cinta
  name                String   // "Cinturón Amarillo"
  colorHex            String   // "#FFD700"
  order               Int      // 1, 2, 3... (progresión)
  kyuDan              String?  // "10º kyu", "1er dan"
  description         String?
  
  // Requisitos para obtener ESTA cinta
  minimumAttendance   Int      @default(0) // Clases desde cinta anterior
  minimumMonths       Int      @default(0) // Meses desde cinta anterior
  minimumAge          Int?
  prerequisiteGrades  String?  // JSON: IDs de cintas que deben tener antes
  
  // Examen
  requiresExam        Boolean  @default(true)
  examCost            Int?     // En centavos
  examDurationMinutes Int?
  examTopics          String?  // JSON: temas a evaluar
  
  // Notificaciones
  notifyOnEligible    Boolean  @default(true)
  notifyOnPromotion   Boolean  @default(true)
  
  // Relaciones
  studentCurrentBelts Student[] @relation("currentBelt")
  studentBeltRecords  StudentBelt[]
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([tenantId, order])
  @@index([tenantId])
}

// TABLA: Historial de cintas por estudiante
model StudentBelt {
  id                  String   @id @default(cuid())
  studentId           String
  student             Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  
  beltGradeId         String
  beltGrade           BeltGrade @relation(fields: [beltGradeId], references: [id])
  
  // Cuándo obtuvo esta cinta
  obtainedAt          DateTime
  
  // Examen (si requiere)
  examAttempts        BeltExamAttempt[]
  lastExamAt          DateTime?
  lastExamScore       Int?
  
  // Asistencias para THIS cinta
  attendanceCount     Int      @default(0) // Contador de asistencias desde que obtuvo ESTA cinta
  
  // Elegibilidad para próxima cinta
  isEligibleForNext   Boolean  @default(false) // Calculado automáticamente
  eligibilityReason   String?  // "Falta 2 asistencias", "En espera de tiempo mínimo"
  
  // Archivado (cuando pasa a siguiente cinta)
  archivedAt          DateTime?
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([studentId, beltGradeId])
  @@index([studentId])
  @@index([isEligibleForNext])
}

// TABLA: Intentos de examen (nueva)
model BeltExamAttempt {
  id                  String   @id @default(cuid())
  studentBeltId       String
  studentBelt         StudentBelt @relation(fields: [studentBeltId], references: [id])
  
  attemptNumber       Int      // 1er intento, 2do intento, etc
  examinerId          String   // clerkId del profesor/evaluador
  
  // Resultado
  status              ExamStatus // PASSED, FAILED, ABSENT
  score               Int?     // 0-100
  notes               String?
  
  scheduledAt         DateTime
  completedAt         DateTime?
  
  // Si aprobó: actualizar StudentBelt
  promotedToBeltId    String?  // ID de la siguiente cinta
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@index([studentBeltId])
  @@index([status])
}

enum ExamStatus {
  SCHEDULED  // Examen programado
  PASSED     // Aprobado
  FAILED     // Reprobado
  ABSENT     // No presentado
}

// ACTUALIZAR: Student model
model Student {
  // ... campos existentes ...
  
  // Cintas
  currentBeltId       String?
  currentBelt         BeltGrade? @relation("currentBelt", fields: [currentBeltId], references: [id])
  
  // Historial completo
  beltHistory         StudentBelt[]
  
  // Contador de asistencias para cinta ACTUAL
  attendanceForCurrentBelt Int @default(0)
  
  // Elegibilidad (calculado/cacheado)
  nextEligibleBeltId  String?
  isEligibleForExam   Boolean @default(false)
  eligibilityCheckedAt DateTime?
}
```

---

## 5. CARACTERÍSTICAS CLAVE (Mejoras)

### 5.1 Cálculo automático de elegibilidad

```tsx
// Función que se ejecuta:
// 1. Cuando se marca asistencia
// 2. Diariamente (cron job)
// 3. Cuando se consulta perfil del alumno

async function calculateBeltEligibility(studentId: string) {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: {
      currentBelt: true,
      beltHistory: {
        where: { archivedAt: null },
        include: { beltGrade: true }
      }
    }
  });
  
  if (!student.currentBelt) return null;
  
  // Obtener siguiente cinta
  const nextBelt = await db.beltGrade.findFirst({
    where: {
      tenantId: student.tenantId,
      order: student.currentBelt.order + 1
    }
  });
  
  if (!nextBelt) return null;
  
  // Verificar requisitos
  const currentBeltRecord = student.beltHistory[0];
  const attendanceRequirementMet = 
    currentBeltRecord.attendanceCount >= nextBelt.minimumAttendance;
  
  const timeRequirementMet = 
    daysSince(currentBeltRecord.obtainedAt) >= 
    (nextBelt.minimumMonths * 30);
  
  const ageRequirementMet = !nextBelt.minimumAge || 
    getAge(student.birthDate) >= nextBelt.minimumAge;
  
  const isEligible = 
    attendanceRequirementMet && 
    timeRequirementMet && 
    ageRequirementMet;
  
  // Guardar en DB
  await db.studentBelt.update({
    where: { id: currentBeltRecord.id },
    data: {
      isEligibleForNext: isEligible,
      eligibilityReason: getEligibilityReason({
        attendance: {met: attendanceRequirementMet, current: currentBeltRecord.attendanceCount, required: nextBelt.minimumAttendance},
        time: {met: timeRequirementMet, months: nextBelt.minimumMonths},
        age: {met: ageRequirementMet, required: nextBelt.minimumAge}
      })
    }
  });
  
  return isEligible;
}
```

### 5.2 Integración con módulo Asistencia

```tsx
// En asistencia.tsx, cuando se marca presente:

await markAttendance(studentId, classDate);

// Sistema automáticamente:
await db.studentBelt.updateMany({
  where: { 
    studentId, 
    archivedAt: null  // Solo cinta actual
  },
  data: { 
    attendanceCount: { increment: 1 }
  }
});

// Y recalcula elegibilidad
await calculateBeltEligibility(studentId);

// Si quedó elegible, enviar notificación
const eligible = await db.studentBelt.findFirst({
  where: { studentId, isEligibleForNext: true }
});

if (eligible) {
  await sendNotification(studentId, {
    title: "¡Estás listo para el examen!",
    message: `Has completado las ${eligible.beltGrade.minimumAttendance} clases requeridas para ascender a ${nextBelt.name}`
  });
}
```

### 5.3 Badge de elegibilidad en UI

```tsx
// Component: BeltEligibilityBadge

export function BeltEligibilityBadge({ student }: Props) {
  const eligible = student.isEligibleForExam;
  
  if (!eligible) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Circle className="h-4 w-4" />
        <span className="text-sm">{student.eligibilityReason}</span>
        {/* Ej: "Falta 2 asistencias (22/24)" */}
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2">
      <CheckCircle2 className="h-4 w-4 text-green-600" />
      <div>
        <span className="font-semibold text-green-600">
          ¡Elegible para examen!
        </span>
        <button className="ml-2 text-green-600 underline">
          Preseleccionar →
        </button>
      </div>
    </div>
  );
}

// Uso:
<BeltEligibilityBadge student={student} />
// Renderiza: ⚪ "Falta 2 asistencias (22/24)" (gris)
// O: 🟢 "¡Elegible para examen! [Preseleccionar →]" (verde)
```

### 5.4 Cierre de acta de examen

```tsx
// En Event/Exam module:

async function submitExamResult(examAttempt: {
  studentId: string;
  result: 'PASSED' | 'FAILED';
  score: number;
  notes?: string;
}) {
  const student = await db.student.findUnique({
    where: { id: examAttempt.studentId },
    include: { currentBelt: true }
  });
  
  if (examAttempt.result === 'PASSED') {
    // 1. Obtener siguiente cinta
    const nextBelt = await db.beltGrade.findFirst({
      where: {
        tenantId: student.tenantId,
        order: student.currentBelt.order + 1
      }
    });
    
    // 2. Crear nuevo registro en StudentBelt
    const newBeltRecord = await db.studentBelt.create({
      data: {
        studentId: student.id,
        beltGradeId: nextBelt.id,
        obtainedAt: new Date()
      }
    });
    
    // 3. Archivar cinta anterior
    await db.studentBelt.update({
      where: { studentId_beltGradeId: { studentId, beltGradeId: student.currentBelt.id } },
      data: { archivedAt: new Date() }
    });
    
    // 4. Actualizar Student.currentBelt
    await db.student.update({
      where: { id: studentId },
      data: { 
        currentBeltId: nextBelt.id,
        attendanceForCurrentBelt: 0  // ← RESETEAR
      }
    });
    
    // 5. Registrar examen
    await db.beltExamAttempt.create({
      data: {
        studentBeltId: recordActual.id,
        attemptNumber: 1,
        examinerId: currentUserId,
        status: 'PASSED',
        score: examAttempt.score,
        notes: examAttempt.notes,
        completedAt: new Date(),
        promotedToBeltId: nextBelt.id
      }
    });
    
    // 6. Generar ingreso (si costo)
    if (nextBelt.examCost) {
      await db.payment.create({
        data: {
          studentId,
          concept: `Examen ${student.currentBelt.name} → ${nextBelt.name}`,
          amount: nextBelt.examCost,
          status: 'PAID'
        }
      });
    }
    
    // 7. Notificar
    await sendEmail(student.email, {
      subject: `¡Felicitaciones! Eres ${nextBelt.name}`,
      body: `Has sido promovido a ${nextBelt.name}. Obtuviste ${examAttempt.score}/100`
    });
    
  } else {
    // REPROBADO
    const currentRecord = await db.studentBelt.findFirst({
      where: { studentId, archivedAt: null }
    });
    
    // Registrar intento fallido (sin cambios)
    await db.beltExamAttempt.create({
      data: {
        studentBeltId: currentRecord.id,
        attemptNumber: currentRecord.examAttempts.length + 1,
        status: 'FAILED',
        score: examAttempt.score,
        notes: examAttempt.notes,
        completedAt: new Date()
      }
    });
    
    // Notificar (sin cambiar cinta)
    await sendEmail(student.email, {
      subject: `Resultado de tu examen de ${student.currentBelt.name}`,
      body: `No pasaste (${examAttempt.score}/100). Feedback: ${examAttempt.notes}. Puedes reintentar en 1 mes.`
    });
  }
}
```

---

## 6. UI/UX MEJORADO

### Página: Configuración de Cintas (Admin)

```
┌─────────────────────────────────────────────────────┐
│ Configuración de Cintas / Grados                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [+ Crear nueva cinta]                              │
│                                                     │
│ Cinta 1: BLANCA                                     │
│ ├─ Color: #FFFFFF                                  │
│ ├─ Requisitos:                                      │
│ │  ├─ Asistencia mínima: 0                         │
│ │  ├─ Tiempo mínimo: 0 meses                       │
│ │  ├─ Edad mínima: -                               │
│ │  └─ ¿Requiere examen?: NO                        │
│ └─ [Editar] [Duplicar] [Eliminar]                  │
│                                                     │
│ Cinta 2: AMARILLA                                  │
│ ├─ Color: #FFD700                                  │
│ ├─ Requisitos:                                      │
│ │  ├─ Asistencia mínima: 24                        │
│ │  ├─ Tiempo mínimo: 3 meses                       │
│ │  ├─ Edad mínima: 5 años                          │
│ │  ├─ ¿Requiere examen?: SÍ                        │
│ │  └─ Costo examen: $50                            │
│ └─ [Editar] [Duplicar] [Eliminar]                  │
│                                                     │
│ ... (más cintas)                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Página: Perfil de Alumno (Profesor/Admin)

```
┌────────────────────────────────────────────────────┐
│ Juan García - Cinturón Amarillo                   │
├────────────────────────────────────────────────────┤
│                                                    │
│ 🟡 CINTA ACTUAL: Amarillo (desde 15/02/2024)     │
│                                                    │
│ ─ ELEGIBILIDAD PARA PRÓXIMO ASCENSO ─            │
│                                                    │
│ 🟢 ¡ELEGIBLE PARA EXAMEN!                        │
│    [Preseleccionar para próximo examen →]         │
│                                                    │
│ Requisitos completados:                           │
│ ✅ Asistencias: 24/24 (completado)               │
│ ✅ Tiempo mínimo: 3 meses (5 meses transcurridos)│
│ ✅ Edad mínima: 5 años (tiene 12 años)          │
│                                                    │
│ ─ HISTORIAL DE CINTAS ─                          │
│                                                    │
│ 🥋 Negra 1er dan (15/10/2024 - Presente)        │
│    Examen: 90/100 ✅                             │
│                                                    │
│ 🟡 Amarillo (15/02/2024 - 15/10/2024)            │
│    Examen: 85/100 ✅                             │
│                                                    │
│ ⚪ Blanca (01/01/2023 - 15/02/2024)               │
│    Asignación inicial                             │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Vista: Lista de Clase (Profesor)

```
┌─────────────────────────────────────────────────────┐
│ Clase: Karate Nivel 1 - 15/02/2024                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Estudiante          Cinta   Asistencia  Elegibilidad│
│ ─────────────────────────────────────────────────  │
│ Juan García        🟡 Amarillo  24/24  🟢 Elegible │
│ María López        ⚪ Blanca    18/24  ⚪ 6 clases  │
│ Carlos Mendez      🟡 Amarillo  20/24  ⚪ 4 clases  │
│ Ana Rodríguez      🟡 Amarillo  24/24  🟢 Elegible │
│                                                     │
│ [Marcar asistencia]                                │
│ [Programar exámenes]                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 7. USUARIO STORIES MEJORADAS

### US-1: Configuración de Plan de Estudios (Admin)

```
Como Administrador del Dojo,
Quiero configurar la estructura de cinturones con requisitos específicos
(asistencia mínima, tiempo mínimo, costo de examen),
Para que el sistema calcule automáticamente cuándo un alumno está listo
y pueda generar ingresos por exámenes.

Criterios de Aceptación:
[ ] El admin puede crear/editar cinturones con todos los parámetros
[ ] El sistema valida que no haya cinturones duplicados en el mismo orden
[ ] El admin puede copiar configuración de cinturones existentes
[ ] Puede desactivar una cinta sin perder historial
[ ] Los cambios aplican solo a futuros ascensos, no retroactivos
```

### US-2: Seguimiento Automático de Elegibilidad (Profesor/Alumno)

```
Como Profesor o Alumno,
Quiero ver claramente cuándo cumple requisitos para ascender,
Para saber exactamente qué falta y cuándo está listo para examen.

Criterios de Aceptación:
[ ] El badge muestra estado: ⚪ (no listo) / 🟢 (elegible) / 🟡 (examen programado)
[ ] Muestra desglose de requisitos (asistencia X/Y, tiempo Z meses, etc)
[ ] El cálculo es automático (se actualiza al marcar asistencia)
[ ] Notificación automática cuando queda elegible
[ ] Profesor puede preseleccionar para próximo examen con 1 clic
```

### US-3: Ejecución y Cierre de Acta de Examen (Profesor)

```
Como Profesor/Evaluador,
Quiero registrar resultado de examen y que TODO se actualice automáticamente,
Para ahorrar tiempo administrativo y evitar errores manuales.

Criterios de Aceptación:
[ ] Al marcar "APROBADO": se actualiza cinta, se resetea asistencias, se archiva anterior
[ ] Al marcar "REPROBADO": se registra intento sin cambiar nada
[ ] Sistema genera ingreso automático (si hay costo de examen)
[ ] Email automático al estudiante con resultado
[ ] Historial de intentos guardado (para reintentos)
[ ] Próximo examen permitido solo después de X días (si reprobó)
```

---

## 8. COMPARATIVA FINAL

| Aspecto | Mi Análisis | Tu Descripción | PROPUESTA FINAL |
|---------|-----------|----------------|-----------------|
| Configuración de cintas | ✅ | ✅ | ✅✅ Mejorada |
| Integración con asistencia | ❌ | ✅ | ✅✅ Automática |
| Cálculo de elegibilidad | ⚠️ | ✅ | ✅✅ Automático + caché |
| Badge visual | ❌ | ✅ | ✅✅ Con detalles |
| Reseteo de asistencias | ❌ | ✅ | ✅✅ Automático |
| Archivado de historial | ❌ | ✅ | ✅✅ Automático |
| Manejo de reprobación | ❌ | ⚠️ | ✅✅ Detallado |
| Analytics | ✅ | ❌ | ✅✅ Completo |
| Integración con pagos | ❌ | ⚠️ | ✅✅ Automática |
| Notificaciones | ⚠️ | ✅ | ✅✅ Multi-canal |
| UI/UX | ⚠️ | ❌ | ✅✅ Completa |

---

## 9. TIMELINE MEJORADO

```
FASE 1: Infraestructura (2 semanas)
├─ Schema Prisma completo
├─ Modelos BeltGrade, StudentBelt, BeltExamAttempt
└─ tRPC procedures base

FASE 2: Cálculos automáticos (2 semanas)
├─ calculateBeltEligibility() función
├─ Integración con módulo Asistencia
├─ Cron job para recalcular diariamente
└─ Caché de elegibilidad en Student

FASE 3: UI de configuración (1 semana)
├─ Admin panel: crear/editar cintas
├─ Vista de requisitos
└─ Validaciones

FASE 4: UI de seguimiento (1.5 semanas)
├─ Badge de elegibilidad
├─ Perfil de alumno mejorado
├─ Lista de clase con elegibilidad
└─ Notificaciones

FASE 5: Exámenes y cierre (2 semanas)
├─ Integración con Event module
├─ Cierre de acta automático
├─ Generación de ingresos
└─ Emails transaccionales

FASE 6: Polish y testing (1 semana)
├─ E2E testing
├─ Casos edge (reprobación, reintentos)
└─ Performance (caché, índices)

─────────────────────────────
TOTAL: 9-10 semanas MVP
```

---

## 10. ARQUITECTURA FINAL

```
┌─────────────────────────────────────────────────────┐
│                 KLASSI - CINTAS SYSTEM              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ENTRADA: Asistencia                               │
│  ↓                                                  │
│  ├─ markAttendance(student) en modules/asistencia │
│  │  └─ Incrementa StudentBelt.attendanceCount     │
│  │  └─ Ejecuta calculateBeltEligibility(student)  │
│  │  └─ Si quedó elegible: sendNotification()      │
│  │                                                  │
│  ENTRADA: Examen                                   │
│  ↓                                                  │
│  ├─ submitExamResult(attempt) en modules/examen   │
│  │  ├─ Si PASSED:                                  │
│  │  │  ├─ Crear nuevo StudentBelt (siguiente)     │
│  │  │  ├─ Archivar anterior                       │
│  │  │  ├─ Actualizar Student.currentBelt          │
│  │  │  ├─ Resetear attendanceForCurrentBelt = 0   │
│  │  │  ├─ Crear Payment (si costo)                │
│  │  │  └─ Enviar email de felicidades             │
│  │  │                                              │
│  │  └─ Si FAILED:                                  │
│  │     ├─ Registrar intento fallido               │
│  │     ├─ NO cambiar cinta                        │
│  │     └─ Enviar email con feedback               │
│  │                                                  │
│  CONSULTA: Perfil de Alumno                       │
│  ↓                                                  │
│  ├─ GET /student/[id]                             │
│  │  ├─ currentBelt (actual)                        │
│  │  ├─ nextEligibleBelt (cacheado)                │
│  │  ├─ isEligibleForExam (boolean)                │
│  │  ├─ eligibilityReason (string)                 │
│  │  ├─ beltHistory (archivado)                    │
│  │  └─ attendanceForCurrentBelt (contador)        │
│  │                                                  │
│  CONSULTA: Lista de clase                         │
│  ↓                                                  │
│  ├─ GET /class/[id]/students                      │
│  │  └─ Cada estudiante con: cinta actual +        │
│  │     asistencias + elegibilidad (badge)         │
│  │                                                  │
└─────────────────────────────────────────────────────┘
```

---

## RESUMEN: LO MEJOR DE AMBOS

✅ **Mi análisis aporta:**
- Modelo escalable (Kyu/Dan, múltiples cintas)
- Analytics y reportes
- Estructura modular

✅ **Tu descripción aporta:**
- Automatización basada en ASISTENCIA (clave)
- Alertas visuales claras
- Integración perfecta con módulos existentes
- Reseteo automático de contadores
- Manejo de reprobación

✅ **Propuesta final agrega:**
- Cálculo automático y cacheado de elegibilidad
- Badge visual dinámico con información detallada
- Flujo completo de examen automatizado
- Generación de ingresos integrada
- Notificaciones multi-canal
- Modelo de datos robusto
- UI/UX específica
- Timeline estimado
