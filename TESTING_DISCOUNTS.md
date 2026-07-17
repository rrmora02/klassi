# Prueba Completa de Descuentos en Pagos de Eventos

Este documento describe el flujo completo de prueba para verificar que los descuentos se registren y reporten correctamente.

## Requisitos Previos

1. Base de datos limpia (usar script `scripts/clean-database.sql` si es necesario)
2. Servidor dev corriendo: `npm run dev`
3. Acceso al dashboard

## Flujo de Prueba Completo

### Paso 1: Crear un Evento

1. Ir a Dashboard > Eventos > Crear evento
2. Llenar datos:
   - **Nombre**: "Evento Test Descuentos"
   - **Fecha**: Cualquier fecha futura
   - **Monto**: **200** (en pesos)
   - **Grupos**: Seleccionar cualquier grupo existente
   - **Fecha límite de pago**: Mismo día o posterior
3. Guardar evento
4. ✅ Verificar que aparece en la lista

### Paso 2: Verificar Pagos Generados

1. Entrar al detalle del evento
2. Buscar los pagos generados en la tabla
3. ✅ Deben aparecer pagos con estado "Pendiente" y monto 200

### Paso 3: Hacer Pago CON Descuento

1. En la tabla de pagos, buscar un alumno
2. Hacer clic en "Pagar"
3. En el modal que aparece:
   - **Monto original**: Debe mostrar 200
   - En el **input de Descuento**: Escribir **50**
   - **Descuento %**: Debe mostrar 25%
   - **Total a pagar**: Debe mostrar **150** ✅
4. Seleccionar método de pago (ej: Efectivo)
5. Confirmar
6. ✅ Debe mostrar toast "Inscripción exitosa"

### Paso 4: Verificar Estadísticas en Detalle del Evento

1. Después de completar el pago, volver al detalle del evento
2. **Verificar KPIs en la parte superior:**
   - **Total cobrado**: Debe mostrar **150** (no 200) ✅
   - **Total esperado**: Debe mostrar un número que refleje:
     - Lo ya cobrado con descuento (150)
     - Más lo pendiente de otros alumnos (200 × número restante)
3. ✅ Los números deben ser congruentes

### Paso 5: Verificar Dashboard > Ingresos del Mes

1. Ir a Dashboard > Principal
2. En la sección "Ingresos del mes":
   - Buscar el evento creado
   - **Verificar que "Cobrado" muestra 150** (no 200) ✅
   - **Total esperado** debe reflejar el descuento aplicado

### Paso 6: Hacer Segundo Pago SIN Descuento

1. En el evento, hacer otro pago a un alumno diferente
2. En el modal:
   - No escribir nada en Descuento (dejar en 0)
   - **Total a pagar**: Debe mostrar **200**
3. Confirmar pago

### Paso 7: Verificar Totales Finales

1. Volver al detalle del evento
2. **Total cobrado**: Debe mostrar **350** (150 + 200) ✅
3. En Dashboard > Ingresos del Mes:
   - **Cobrado**: Debe mostrar **350** (no 400) ✅

### Paso 8: Hacer Pago CON Descuento Diferente

1. Hacer un tercer pago con descuento diferente (ej: 200 con descuento 75 = 125)
2. Confirmar
3. **Total cobrado final**: Debe ser 150 + 200 + 125 = **475** ✅

## Puntos Críticos a Verificar

- ✅ El input de descuento permite escribir y borrar correctamente
- ✅ El "Total a pagar" se calcula correctamente (monto - descuento)
- ✅ El porcentaje de descuento se muestra correctamente
- ✅ El dashboard muestra lo REALMENTE cobrado (con descuentos restados)
- ✅ Los reportes mensuales reflejan dinero real, no montos originales
- ✅ El total esperado considera descuentos ya aplicados

## Checklist Final

- [ ] Descuento se aplica correctamente en el modal
- [ ] Total a pagar se calcula correctamente
- [ ] Dashboard muestra dinero real cobrado
- [ ] Ingresos del mes son precisos
- [ ] Múltiples descuentos se suman correctamente
- [ ] Sin descuento funciona igual que antes

---

**IMPORTANTE**: Este es un comportamiento crítico relacionado con dinero. Si algún punto no se cumple, reportar inmediatamente.
