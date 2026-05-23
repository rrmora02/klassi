# 🔥 Klassi Authenticated Load Testing Guide

**Importante:** Este test respeta el límite de conexiones de Supabase (15 en plan gratuito).
Máximo de usuarios concurrentes: **14** (dejando margen de seguridad).

## Requisitos

### 1. k6 instalado
```bash
# macOS
brew install k6

# Windows (PowerShell)
choco install k6

# Linux
sudo apt-get install k6

# O descargar desde https://k6.io/docs/getting-started/installation/
```

### 2. Usuario de Prueba en Base de Datos
Necesitas un usuario con email/password para las pruebas:
```sql
-- Query para verificar usuarios existentes
SELECT id, email, name, status FROM "User" 
WHERE tenantId = 'YOUR_TENANT_ID' LIMIT 1;
```

Usa las credenciales de un usuario existente, o crea uno nuevo.

### 3. IDs de Prueba
Necesitas obtener:
- **TENANT_ID**: Tu tenant/escuela
- **GROUP_ID**: Un grupo para testing (opcional)
- **TEST_EMAIL**: Email de usuario válido
- **TEST_PASSWORD**: Contraseña del usuario

## Cómo Obtener los IDs

### Opción 1: Desde la Base de Datos
```bash
node get-test-ids.js
# Salida:
# ✅ Tenant: Mi Escuela
#    ID: cmou5jp0v0001zcaw4bfkigy7
#
# ✅ Group: Karate 1
#    ID: cmou5mi3q0009zcawt2d334it
#
# ✅ User: admin@escuela.com
#    ID: cmou5jovg0000zcaw7w4s272e
```

### Opción 2: Desde DevTools
1. Abre tu navegador en http://localhost:3000
2. Haz login
3. F12 → Application → Cookies → Busca `__session` o similar
4. Copia el email del usuario logueado

## Ejecutar Tests

### Configuración Rápida
```bash
chmod +x run-load-test-auth.sh
./run-load-test-auth.sh
```

El script te pedirá:
- TENANT_ID
- GROUP_ID (opcional)
- TEST_EMAIL
- TEST_PASSWORD

### Con Parámetros Directos
```bash
API_BASE="http://localhost:3000/api/trpc" \
TENANT_ID="cmou5jp0v0001zcaw4bfkigy7" \
GROUP_ID="cmou5mi3q0009zcawt2d334it" \
TEST_EMAIL="test@escuela.com" \
TEST_PASSWORD="password123" \
./run-load-test-auth.sh
```

### Configuración Personalizada
```bash
# Usar diferentes endpoints o configuraciones
API_BASE="http://localhost:3001/api/trpc" \
k6 run load-test-auth.js \
  --env TENANT_ID="your-tenant-id" \
  --env TEST_EMAIL="test@example.com" \
  --env TEST_PASSWORD="password123"
```

## Perfil de Carga

El test sigue este patrón de usuarios:

```
14 ┤                 ╭─╮
12 ┤                 │ │
10 ┤             ╭───╯ │
 8 ┤             │     │
 6 ┤         ╭───╯     │
 4 ┤     ╭───╯         │
 2 ┤ ╭───╯             │
 0 ┴─╯─────────────────╯────
   30s  1m  1m  1m  2m  1m
  Ramp Ramp Ramp Sustain Down
```

**Etapas:**
1. **Ramp-up 1** (30s): 0 → 2 usuarios
2. **Ramp-up 2** (1m): 2 → 5 usuarios
3. **Ramp-up 3** (1m): 5 → 10 usuarios
4. **Ramp-up 4** (1m): 10 → 14 usuarios (MÁXIMO)
5. **Sustain** (2m): 14 usuarios (carga máxima)
6. **Ramp-down** (1m): 14 → 0 usuarios

**Duración total:** ~8 minutos

## Métricas a Revisar

### HTTP Request Duration
```
p(95)<500ms  = 95% de requests < 500ms ✅
p(99)<1000ms = 99% de requests < 1s ✅
```

### Error Rate
```
< 5% = Aceptable
< 1% = Excelente
```

### Connection Pool Usage
Monitorea en tiempo real:
```bash
# En otra terminal
watch -n 1 'psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = '\''active'\''"'
```

## Interpretación de Resultados

### Buen Performance
```
http_req_duration....: avg=245ms    min=50ms     med=220ms   max=800ms    p(95)=450ms  p(99)=950ms
http_req_failed......: 0.8%
Connection pool peak.: 12/15
```

### Performance Problema
```
http_req_duration....: avg=1200ms   min=100ms    med=950ms   max=5000ms   p(95)=2500ms p(99)=4500ms
http_req_failed......: 15%
Connection pool peak.: 15/15 (SATURADO)
```

## Solución de Problemas

### "Connection refused"
- Dev server no está corriendo: `npm run dev`
- Verifica que API_BASE es correcto

### "Invalid credentials"
- Verifica TEST_EMAIL y TEST_PASSWORD
- Usuario debe tener acceso al TENANT_ID

### "max clients reached in session mode"
- **CONEXIONES AGOTADAS**: Reduce max VUs
- El test está limitado a 14, pero tu app usa conexiones adicionales
- Reduce connection pool usage en otras partes

### "p95 > 500ms" o error rate alto
- Analiza qué queries son lentas (ver Performance en DevTools)
- Revisa PostgreSQL slow query log
- Verifica índices en base de datos

## Reportes

Los resultados se guardan en:
```
stress-test-reports/
├── results_20240523_120530.json
├── results_20240523_121545.json
└── ...
```

### Analizar Resultados
```bash
# Ver resumen
cat stress-test-reports/results_20240523_120530.json | jq '.metrics'

# Ver por escenario
cat stress-test-reports/results_20240523_120530.json | jq '.metrics | keys'
```

## Comparar Antes vs Después de Optimizaciones

**Antes (sin optimizaciones):**
```
p(95) duration: 1200ms
error rate: 10%
max connections used: 15/15 (SATURADO)
```

**Después (con optimizaciones de performance):**
```
p(95) duration: 400ms
error rate: < 1%
max connections used: 12/15
```

## Recursos

- [k6 Documentation](https://k6.io/docs/)
- [tRPC Performance](https://trpc.io/docs/performance)
- [PostgreSQL Connection Pooling](https://wiki.postgresql.org/wiki/Number_Of_Database_Connections)
- [Supabase Pricing](https://supabase.com/pricing)
