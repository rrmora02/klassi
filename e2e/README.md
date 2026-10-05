# Pruebas E2E (Playwright)

Suite de QA automatizado de Klassi: portal de familias (PWA), dashboard del
staff e instructor. Corre contra tu entorno de **desarrollo**.

## Requisitos

1. Dependencias y navegador (una sola vez):

   ```bash
   npm install
   npx playwright install chromium
   ```

2. Tu `.env` de desarrollo normal (la app se levanta con `npm run dev`
   automáticamente si no está corriendo).

3. Credenciales de prueba en `.env.e2e` (copiar de `.env.e2e.example`).
   **Solo usuarios de prueba de la instancia de desarrollo de Clerk** —
   nunca producción. `.env.e2e` está en `.gitignore`: no se commitea.

### Usuarios de prueba necesarios

| Variable | Usuario |
|---|---|
| `E2E_STAFF_EMAIL/PASSWORD` | ADMIN o RECEPTIONIST de una escuela de prueba |
| `E2E_PARENT_EMAIL/PASSWORD` | Tutor con un alumno vinculado y **sin** membresía de escuela |
| `E2E_INSTRUCTOR_EMAIL/PASSWORD` | Rol INSTRUCTOR con al menos un grupo asignado |

También se necesitan `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`
(los mismos de tu `.env`; puedes repetirlos en `.env.e2e` o exportarlos).

Sin credenciales, solo corren las pruebas **smoke** (sin login): PWA,
redirecciones y cabeceras — útiles igual.

> Nota: incluso las pruebas smoke que abren el navegador necesitan que la
> app corra con llaves de Clerk **reales de desarrollo** (las de tu `.env`):
> el middleware de Clerk hace un "handshake" contra su dominio en la primera
> visita, y con llaves falsas esa redirección falla. Las pruebas de
> manifest/service worker/cabeceras no abren navegador y pasan siempre.

## Correr

```bash
npm run test:e2e          # toda la suite
npm run test:e2e:ui       # modo interactivo (recomendado para depurar)
npx playwright test smoke # solo un archivo
npm run test:e2e:report   # abrir el último reporte HTML
```

Contra un servidor ya levantado (ej. build de producción):

```bash
npm run build && npm start   # en una terminal
E2E_BASE_URL=http://localhost:3000 npm run test:e2e   # en otra
```

## Principios de la suite

- **Solo lectura**: ninguna prueba crea, modifica ni borra datos. Los flujos
  de escritura (enviar comunicado, subir comprobante, marcar asistencia)
  están en el plan manual (`docs/plan-pruebas-qa.md`) hasta tener un
  entorno de datos desechable.
- **Selectores por texto visible para el usuario** (roles y textos en
  español), no por clases CSS: si cambia el texto de la UI, la prueba
  fallará a propósito.
- Un worker: los flujos comparten la base de prueba y no deben pisarse.

## Entorno local reproducible (build real + datos semilla)

`scripts/e2e-local.sh` prepara una base **desechable**, la siembra (`e2e-seed.local.ts`, ligada a
los usuarios de prueba de Clerk de desarrollo), construye la app en modo producción y la deja
corriendo. Rechaza cualquier URL de Supabase.

```bash
scripts/e2e-local.sh all     # setup + build + start (usa Postgres local si no das E2E_DATABASE_URL)
scripts/e2e-local.sh stop    # detiene el servidor (mata también procesos next-server huérfanos)
npm run test:e2e
```

Tras reconstruir (`build`), **reinicia el servidor con `start`**: un `next-server` viejo vivo
sirve HTML de un build reemplazado (su CSS da 404 y las páginas salen sin estilos). El script ya
lo detiene antes de arrancar.

## Estándares de interfaz y accesibilidad (spec 001)

- `ui-standards.spec.ts` mide en el portal y el dashboard: texto menor de 12 px, objetivos
  táctiles pequeños (44 px portal / 36 px dashboard), desborde horizontal y contraste AA propio en
  claro y oscuro (axe no evalúa texto sobre fondos translúcidos).
- `a11y.spec.ts` ejecuta axe (WCAG 2 A/AA) en claro y oscuro.
- Ambas comparan contra `ui-baseline.json`: **no pueden empeorar**. Si mejoran avisan para bajar la
  línea base. Comandos útiles:

```bash
UI_UPDATE_BASELINE=1 npx playwright test ui-standards a11y   # reescribe la línea base (revisa el diff)
UI_STRICT=1 npx playwright test ui-standards a11y            # exige cero infracciones (meta final)
CAPTURE_DIR=<carpeta> npx playwright test capture            # capturas de todas las pantallas
```

## Notas para sandboxes con proxy de salida

Chromium preinstalado: `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`. Para que confíe en el
gateway de salida hay que importar **todas** las CAs de `/root/.ccr/ca-bundle.crt` al almacén NSS
(`certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n <nombre> -i <cert>`, una por certificado; con
solo la primera sigue fallando con `ERR_CERT_AUTHORITY_INVALID`). `libnss3-tools` aporta `certutil`.
