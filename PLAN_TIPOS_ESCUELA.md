# Plan: Tipos de Escuela en Klassi

## 1. CONCEPTO

```
Onboarding:
"¿Qué tipo de escuela manejas?"

├─ Escuela de Karate
│  ├─ Mostrar: Sistema de cintas
│  ├─ Mostrar: Exámenes de cintas
│  ├─ Mostrar: Niveles específicos (blanca, amarilla, etc)
│  └─ Campos: Tipo de cinta (kyu/dan)
│
├─ Escuela de Yoga/Pilates
│  ├─ Mostrar: Clases por modalidad
│  ├─ Mostrar: Sesiones/paquetes
│  └─ Campos: Nivel (principiante, intermedio, avanzado)
│
├─ Escuela de Baile
│  ├─ Mostrar: Coreografías
│  ├─ Mostrar: Presentaciones
│  └─ Campos: Estilos (ballet, contemporáneo)
│
├─ Escuela de Música
│  ├─ Mostrar: Instrumentos
│  ├─ Mostrar: Recitales
│  └─ Campos: Nivel de instrumento
│
└─ Escuela General (por defecto)
   ├─ Mostrar: Todo básico
   ├─ Niveles: Principiante, Intermedio, Avanzado
   └─ Sin features especializadas
```

---

## 2. CAMBIOS TÉCNICOS

### 2.1 Base de datos (Prisma)

```prisma
// Enum para tipos de escuela
enum SchoolType {
  KARATE        // Artes marciales (cintas, exámenes)
  YOGA          // Yoga, pilates, meditación
  DANCE         // Baile, danza
  MUSIC         // Música, instrumentos
  SWIMMING      // Natación
  SPORTS        // Deporte general
  LANGUAGE      // Idiomas
  ACADEMIC      // Academia/Tutoría
  GENERAL       // Escuela genérica (por defecto)
}

model Tenant {
  // ... campos existentes ...
  
  // NUEVO: Tipo de escuela
  schoolType    SchoolType @default(GENERAL)
  
  // Metadata por tipo
  schoolTypeConfig String? // JSON con config específica por tipo
  
  // Ej: {
  //   "karate": { "enableBeltSystem": true, "kyuDanFormat": "traditional" },
  //   "dance": { "enableStyles": true, "styles": ["ballet", "jazz"] }
  // }
  
  updatedAt     DateTime @updatedAt
  
  @@index([schoolType])
}

// Opcional: Tabla para features por tipo
model SchoolTypeFeature {
  id           String   @id @default(cuid())
  schoolType   SchoolType
  featureName  String   // "belt_system", "exams", "styles"
  isEnabled    Boolean  @default(true)
  description  String?
  
  @@unique([schoolType, featureName])
}
```

### 2.2 Actualizar Onboarding

**Archivo:** `src/app/onboarding/page.tsx`

```tsx
// Agregar al formulario de onboarding

<FormField
  control={form.control}
  name="schoolType"
  render={({ field }) => (
    <FormItem>
      <FormLabel>¿Qué tipo de escuela es?</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona tipo de escuela" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="KARATE">🥋 Karate / Artes Marciales</SelectItem>
          <SelectItem value="YOGA">🧘 Yoga / Pilates</SelectItem>
          <SelectItem value="DANCE">💃 Baile / Danza</SelectItem>
          <SelectItem value="MUSIC">🎵 Música</SelectItem>
          <SelectItem value="SWIMMING">🏊 Natación</SelectItem>
          <SelectItem value="SPORTS">⚽ Deporte General</SelectItem>
          <SelectItem value="LANGUAGE">🌍 Idiomas</SelectItem>
          <SelectItem value="ACADEMIC">📚 Academia / Tutoría</SelectItem>
          <SelectItem value="GENERAL">🏫 Otra / General</SelectItem>
        </SelectContent>
      </Select>
      <FormDescription>
        Esto nos ayuda a mostrar features relevantes para tu escuela
      </FormDescription>
    </FormItem>
  )}
/>

// En handleSubmit:
const { schoolType } = form.getValues();

await createTenant.mutateAsync({
  // ... otros campos ...
  schoolType,
});
```

---

## 3. CONDICIONALES EN LA UI

### 3.1 Hook para verificar tipo de escuela

```ts
// src/lib/hooks/use-school-type.ts

export function useSchoolType() {
  const [tenant] = useAtom(activeTenantAtom);
  
  return {
    schoolType: tenant?.schoolType || 'GENERAL',
    isKarate: tenant?.schoolType === 'KARATE',
    isDance: tenant?.schoolType === 'DANCE',
    isYoga: tenant?.schoolType === 'YOGA',
    isMusic: tenant?.schoolType === 'MUSIC',
    isAcademic: tenant?.schoolType === 'ACADEMIC',
  };
}
```

### 3.2 Mostrar features condicionalmente

**En sidebar:**
```tsx
const { isKarate } = useSchoolType();

const SIDEBAR_ITEMS = [
  // items generales...
  ...(isKarate ? [
    { 
      label: "Cintas", 
      href: "/dashboard/cintas",
      icon: Shield,
      roles: ["ADMIN"]
    },
    { 
      label: "Exámenes", 
      href: "/dashboard/examenes",
      icon: Award,
      roles: ["ADMIN"]
    }
  ] : [])
];
```

**En configuración:**
```tsx
return (
  <div>
    {/* Configuración general siempre */}
    <Section title="General">
      {/* ... */}
    </Section>
    
    {/* Configuración específica según tipo */}
    {isKarate && (
      <Section title="Sistema de Cintas">
        <BeltConfiguration />
      </Section>
    )}
    
    {isDance && (
      <Section title="Estilos de Baile">
        <DanceStylesConfiguration />
      </Section>
    )}
    
    {isYoga && (
      <Section title="Modalidades">
        <YogaModesConfiguration />
      </Section>
    )}
  </div>
);
```

**En perfil de alumno:**
```tsx
return (
  <div>
    {/* Información general siempre */}
    <BasicInfo student={student} />
    
    {/* Historial de cintas (solo Karate) */}
    {isKarate && (
      <BeltHistory student={student} />
    )}
    
    {/* Estilos aprendidos (solo Danza) */}
    {isDance && (
      <LearnedStyles student={student} />
    )}
    
    {/* Instrumentos (solo Música) */}
    {isMusic && (
      <Instruments student={student} />
    )}
  </div>
);
```

---

## 4. MODELOS DE DATOS POR TIPO

### Karate 🥋
```
Específico:
├─ Belt (cintas)
├─ BeltRequest (solicitudes)
├─ StudentBelt (historial)
├─ Exam (exámenes)
└─ BeltRequirement (requisitos)

Group levels:
├─ Blanca, Amarilla, Naranja, Verde, Azul, Marrón, Negra
└─ Subgrados (1-3 kyu, 1-10 dan)
```

### Danza 💃
```
Específico:
├─ Style (ballet, jazz, contemporáneo)
├─ Choreography (coreografías)
├─ Performance (presentaciones)
└─ StudentStyle (estilos aprendidos)

Group levels:
├─ Blanca (sin experiencia)
├─ Amarilla (básico)
├─ Verde (intermedio)
├─ Azul (avanzado)
└─ Negra (profesional)
```

### Música 🎵
```
Específico:
├─ Instrument (violín, piano, guitarra)
├─ Piece (piezas musicales)
├─ RecitalPerformance
└─ StudentInstrument (instrumentos por alumno)

Group levels:
├─ Beginner (grado 1-2)
├─ Intermediate (grado 3-5)
├─ Advanced (grado 6-8)
└─ Professional (grado 9-10)
```

### General 🏫
```
Estándar Klassi:
├─ Group
├─ Student
├─ Enrollment
├─ Attendance
└─ Payment

Group levels:
├─ BEGINNER
├─ INTERMEDIATE
├─ ADVANCED
└─ PROFESSIONAL
```

---

## 5. IMPLEMENTACIÓN POR FASES

### FASE 1: Infraestructura (1-2 semanas)

```
[ ] Agregar enum SchoolType a Prisma
[ ] Migración: Agregar schoolType a Tenant
[ ] Actualizar onboarding con selector
[ ] Crear hook useSchoolType()
[ ] Agregar campo en configuración de escuela
```

### FASE 2: Condicionales básicos (1 semana)

```
[ ] Mostrar/ocultar items en sidebar según tipo
[ ] Mostrar/ocultar secciones en configuración
[ ] Mostrar/ocultar columnas en tablas
[ ] Actualizar perfil de alumno condicionalmente
```

### FASE 3: Features específicas (Por tipo, 2-4 semanas cada una)

```
KARATE (ya tenemos análisis):
[ ] Tablas Belt, StudentBelt, BeltRequest, Exam
[ ] Módulo de cintas
[ ] Solicitudes de cambio
[ ] Exámenes

DANCE (ejemplo):
[ ] Tablas Style, Choreography, StudentStyle
[ ] Módulo de estilos
[ ] Coreografías por grupo
[ ] Presentaciones

MUSIC:
[ ] Tablas Instrument, Piece, StudentInstrument
[ ] Módulo de instrumentos
[ ] Repertorio por alumno
[ ] Recitales
```

### FASE 4: Analytics por tipo (2 semanas)

```
[ ] Karate: Gráficos de progresión de cintas
[ ] Danza: Coreografías aprendidas por alumno
[ ] Música: Instrumentos por nivel
[ ] Presentaciones/exámenes por tipo
```

---

## 6. CONVERSIÓN DE ESCUELAS EXISTENTES

```
Para escuelas actuales:
- Default: schoolType = "GENERAL"
- Opción en configuración: "Cambiar tipo de escuela"
- Si cambian tipo:
  ├─ Se crea config específica
  ├─ Se habilitan nuevos features
  └─ Se conservan datos existentes

Migration script:
- Leer GroupLevel actual (BEGINNER, INTERMEDIATE, ADVANCED)
- Si es Karate: convertir a Belt sistema automáticamente
```

---

## 7. ROADMAP DE FEATURES FUTUROS

```
MVP (Fase 1-2): Infraestructura + Karate

Year 2 (Fase 3):
├─ Danza
├─ Música
└─ Yoga

Year 3 (Expansión):
├─ Natación
├─ Idiomas
├─ Academia/Tutoría
└─ Deportes generales
```

---

## 8. DIAGRAMA DE DECISIONES

```
Usuario → Onboarding
           ↓
      "¿Tipo de escuela?"
           ↓
    ┌──────┴──────┬──────────┬──────────┬──────────┐
    │             │          │          │          │
  KARATE       DANZA       MÚSICA     YOGA      GENERAL
    │             │          │          │          │
    ├─ Cintas     ├─ Estilos ├─ Instrumentos ├─ Modalidades ├─ Estándar
    ├─ Exámenes   ├─ Coreografías ├─ Recitales ├─ Nivel   └─ Grupos
    ├─ Kyu/Dan    └─ Presentaciones └─ Repertorio └─ Intensidad  
    └─ Ingresos
```

---

## 9. CÓDIGO EJEMPLO: Componente adaptativo

```tsx
// src/components/SchoolTypeWrapper.tsx

interface SchoolTypeWrapperProps {
  children: React.ReactNode;
  show: SchoolType | SchoolType[];
}

export function SchoolTypeWrapper({ 
  children, 
  show 
}: SchoolTypeWrapperProps) {
  const { schoolType } = useSchoolType();
  
  const showsThisType = Array.isArray(show) 
    ? show.includes(schoolType)
    : show === schoolType;
  
  if (!showsThisType) return null;
  
  return <>{children}</>;
}

// Uso:
<SchoolTypeWrapper show="KARATE">
  <BeltManagement />
</SchoolTypeWrapper>

<SchoolTypeWrapper show={["DANCE", "MUSIC"]}>
  <StylesManagement />
</SchoolTypeWrapper>

<SchoolTypeWrapper show="GENERAL">
  <StandardFeatures />
</SchoolTypeWrapper>
```

---

## 10. BENEFICIOS

```
✅ UX limpia (sin features que no necesitan)
✅ Escalable (agregar nuevos tipos fácilmente)
✅ Monetizable (cada tipo = suscripción diferente?)
✅ Posicionamiento (Klassi = especialista en Karate/Danza)
✅ Onboarding claro (sabe qué esperar)
✅ Datos mejor organizados
✅ Analytics específico por tipo
```

---

## 11. ESTIMACIÓN TOTAL

| Componente | Semanas |
|-----------|---------|
| Infraestructura | 1-2 |
| Condicionales básicos | 1 |
| Karate (completo) | 6-8 |
| Danza | 4-6 |
| Música | 4-6 |
| Otros tipos | 2-3 cada uno |
| **MVP (Karate ready)** | **8-11 semanas** |

---

## SIGUIENTE PASO

Actualizar el **ANALISIS_SISTEMA_CINTAS_KARATE.md** con:

```
1. Captura de pantalla de onboarding con selector
2. Diagrama de cómo se ocultan features
3. Plan de implementación integrado
4. Timeline revisado
```

¿Comenzamos con esto?
