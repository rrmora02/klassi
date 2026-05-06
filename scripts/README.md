# Scripts de Base de Datos

## clean-database.sql

Script para limpiar completamente la base de datos y dejarla lista para pruebas desde cero.

### ⚠️ ADVERTENCIA
**Este script elimina TODOS los datos de la base de datos.** No hay forma de recuperarlos después de ejecutar. Solo usar en desarrollo/testing.

### Cómo usar en Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Abre la sección **SQL Editor**
3. Copia todo el contenido de `clean-database.sql`
4. Pégalo en el editor
5. Presiona **Run** (o Ctrl+Enter)

### Resultado

- ✅ Todas las tablas quedan vacías
- ✅ La estructura de BD se mantiene intacta
- ✅ Los enums y tipos personalizados se conservan
- ✅ Listo para crear datos de prueba desde cero

### Qué ocurre

1. Se desactivan temporalmente las restricciones de foreign keys
2. Se vacían todas las tablas en orden correcto
3. Se reactivan las restricciones
4. Se muestra el estado final

### Datos que se eliminan

- Tenants (escuelas)
- Users (usuarios)
- Students (alumnos)
- Groups (grupos/clases)
- Enrollments (inscripciones)
- Payments (pagos mensuales)
- Events (eventos)
- EventPayments (pagos de eventos)
- Attendance (asistencias)
- Instructors (instructores)
- Disciplines (disciplinas)
- Y más...

### Después de limpiar

1. Reinicia el servidor dev: `npm run dev`
2. Abre la app y comienza a crear datos de prueba
3. Podrás ver el tour de onboarding nuevamente
4. Todos los contadores comenzarán en 0
