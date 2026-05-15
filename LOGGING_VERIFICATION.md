# Verificación de Pino y Sentry

Esta guía te ayudará a verificar que Pino (logging) y Sentry (error tracking) están funcionando correctamente en tu aplicación.

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno

Primero, agrega estas variables a tu `.env.local`:

```env
# Sentry (opcional para desarrollo, requerido para producción)
NEXT_PUBLIC_SENTRY_DSN=https://[TU_ID]@[TU_HOST].ingest.sentry.io/[TU_PROJECT]
SENTRY_DSN=https://[TU_ID]@[TU_HOST].ingest.sentry.io/[TU_PROJECT]

# Logging
LOG_LEVEL=info
```

Para obtener el DSN: https://sentry.io

### 2. Iniciar la Aplicación

```bash
npm run dev
```

Deberías ver en la consola algo como:
```
[@sentry/nextjs] ACTION REQUIRED: To instrument navigations...
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
```

---

## 📝 Opción 1: Verificar con Script

Ejecuta el script de prueba:

```bash
npx tsx scripts/verify-logging.ts
```

Deberías ver:
- ✅ Logs de Pino con diferentes niveles (info, warn, debug, error)
- ✅ Mensaje confirmando que Sentry capturó un error de prueba
- ✅ Configuración detectada

---

## 🖥️ Opción 2: Verificar en Dashboard

1. Inicia la aplicación: `npm run dev`
2. Ve a: `http://localhost:3000/dashboard/test-logging`
3. Haz clic en los botones para enviar:
   - **Error de Prueba**: Envía un error a Sentry
   - **Log de Prueba**: Envía logs a Pino

### Qué Ver:

**En tu navegador:**
```json
{
  "success": true,
  "message": "Error/Log enviado",
  "sentryConfigured": true
}
```

**En la consola del servidor (`npm run dev`):**
```
[test-error] context=test-error
  message: "Test error request received"
  ...
```

---

## 🔍 Verificación Detallada

### ✅ Pino está funcionando si ves logs como:

```
[12:34:56] INFO  test-message
  timestamp: 2024-05-15T12:34:56.000Z
  level: info
  source: api/test/log-message
```

**Donde buscar:**
- Consola del servidor (donde corre `npm run dev`)
- Logs con prefijo `[context-name]`
- Diferentes colores según nivel (rojo para error, amarillo para warn)

### ✅ Sentry está funcionando si ves:

1. **En tu Sentry.io Dashboard:**
   - Nueva transacción de error con tag `type: test`
   - Mensaje: "Test error message"
   - Contexto del error (timestamp, usuario, etc)

2. **En la consola del servidor:**
   ```
   [test-error] context=test-error
     message: "Error sent to Sentry"
     errorMessage: "Test error message - This is a controlled test error"
   ```

---

## 🐛 Solución de Problemas

### "No veo logs de Pino"

1. Verifica que `LOG_LEVEL=info` esté configurado
2. Comprueba que estés mirando la consola correcta (el servidor, no el navegador)
3. Reinicia `npm run dev`

### "No veo errores en Sentry"

1. Verifica que tengas `SENTRY_DSN` configurado
2. Asegúrate de estar en Sentry.io con la sesión iniciada
3. Revisa la pestaña "Issues" en tu proyecto Sentry
4. Usa el tag `type: test` para filtrar pruebas

### "Veo warnings de Sentry"

Estos son normales en desarrollo y se resolverán automáticamente:
- `[@sentry/nextjs] ACTION REQUIRED...` - Solo aviso, funciona igual
- Desaparecerán cuando configures completamente Sentry

---

## 📊 Niveles de Log (Pino)

| Nivel | Ejemplo | Uso |
|-------|---------|-----|
| `debug` | `logger.debug()` | Información detallada para debugging |
| `info` | `logger.info()` | Eventos importantes normales |
| `warn` | `logger.warn()` | Advertencias, situaciones inusuales |
| `error` | `logger.error()` | Errores que necesitan atención |

---

## 🎯 En Producción

### Configuración recomendada:

```env
# Producción
LOG_LEVEL=warn
NODE_ENV=production
SENTRY_DSN=https://[TU_ID]@[TU_HOST].ingest.sentry.io/[TU_PROJECT]
```

Con esta configuración:
- Solo errores y warnings se loguean (más eficiente)
- Todos los errores se reportan a Sentry automáticamente
- Mejor rendimiento

---

## 📚 Referencias

- **Pino Docs:** https://getpino.io
- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Archivos relacionados:**
  - `/src/lib/logger.ts` - Configuración de Pino
  - `/src/lib/loggingService.ts` - Servicio de logging
  - `/sentry.*.config.ts` - Configuración de Sentry
  - `/src/instrumentation.ts` - Inicialización
  - `/src/app/global-error.tsx` - Error boundary global
