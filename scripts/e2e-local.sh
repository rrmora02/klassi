#!/usr/bin/env bash
# Entorno de verificación local para las pruebas E2E y las capturas de UI.
# Prepara una base de datos DESECHABLE con datos semilla, construye la app en
# modo producción y la deja corriendo. Nunca apunta a producción.
#
#   scripts/e2e-local.sh setup   # base + esquema + datos semilla
#   scripts/e2e-local.sh build   # next build con las variables de prueba
#   scripts/e2e-local.sh start   # next start en E2E_PORT (3000 por defecto)
#   scripts/e2e-local.sh stop    # detiene el servidor
#   scripts/e2e-local.sh all     # setup + build + start
#
# Variables (todas opcionales salvo las llaves de Clerk de DESARROLLO, que se
# leen del entorno o de .env.e2e):
#   E2E_DATABASE_URL  base desechable propia. Sin ella se usa un Postgres local
#                     (Linux con servicio `postgresql`, requiere root).
#   E2E_PORT          puerto del servidor (3000)
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${E2E_PORT:-3000}"
PIDFILE=".e2e-server.pid"
DEFAULT_DB="postgresql://klassi:klassi@localhost:5432/klassi_e2e"
DB_URL="${E2E_DATABASE_URL:-$DEFAULT_DB}"

if [ -f .env.e2e ]; then set -a; . ./.env.e2e; set +a; fi

: "${CLERK_SECRET_KEY:?Falta CLERK_SECRET_KEY (instancia de DESARROLLO)}"
: "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:?Falta NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}"

case "$DB_URL" in
  *supabase.co*|*pooler.supabase.com*)
    echo "Rechazado: E2E_DATABASE_URL parece una base de Supabase. Usa una base desechable." >&2; exit 1 ;;
esac

export_runtime_env() {
  export DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL"
  export NEXT_PUBLIC_APP_URL="http://localhost:${PORT}"
  export CRON_SECRET="${CRON_SECRET:-e2e-local-cron}"
  export RESEND_API_KEY="${RESEND_API_KEY:-re_placeholder}"
  export STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-sk_test_placeholder}"
  export SUPABASE_URL="${SUPABASE_URL:-https://placeholder.supabase.co}"
  export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-placeholder}"
  # Las llaves VAPID de prueba se generan una vez y se reutilizan: la pública se
  # incrusta en el build, así que build y start deben compartirlas.
  if [ -z "${NEXT_PUBLIC_VAPID_PUBLIC_KEY:-}" ] || [ -z "${VAPID_PRIVATE_KEY:-}" ]; then
    if [ ! -f .e2e-vapid.env ]; then
      local keys
      keys="$(npx web-push generate-vapid-keys --json 2>/dev/null)"
      {
        echo "NEXT_PUBLIC_VAPID_PUBLIC_KEY=$(echo "$keys" | python3 -c 'import sys,json;print(json.load(sys.stdin)["publicKey"])')"
        echo "VAPID_PRIVATE_KEY=$(echo "$keys" | python3 -c 'import sys,json;print(json.load(sys.stdin)["privateKey"])')"
      } >.e2e-vapid.env
    fi
    set -a; . ./.e2e-vapid.env; set +a
  fi
}

ensure_local_postgres() {
  [ -n "${E2E_DATABASE_URL:-}" ] && return 0
  service postgresql start >/dev/null 2>&1 || true
  for _ in $(seq 1 15); do pg_isready -q -h localhost && break; sleep 1; done
  su postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='klassi'\"" | grep -q 1 \
    || su postgres -c "psql -c \"CREATE ROLE klassi LOGIN SUPERUSER PASSWORD 'klassi'\"" >/dev/null
  su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='klassi_e2e'\"" | grep -q 1 \
    || su postgres -c "createdb -O klassi klassi_e2e"
}

cmd_setup() {
  ensure_local_postgres
  export_runtime_env
  npx prisma generate >/dev/null
  # Idempotente: se vacía la base DESECHABLE y se vuelve a sembrar
  npx prisma db push --skip-generate --force-reset --accept-data-loss >/dev/null
  npx tsx e2e-seed.local.ts
}

cmd_build() { export_runtime_env; npm run build; }

cmd_stop() {
  # `npx` lanza next-server como hijo, así que no basta matar el PID guardado:
  # se mata el grupo y, además, cualquier proceso que escuche en el puerto. Un
  # servidor viejo vivo sirve HTML de un build reemplazado (CSS 404, sin estilos).
  if [ -f "$PIDFILE" ]; then
    kill -- "-$(cat "$PIDFILE")" 2>/dev/null || kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
  # El proceso hijo se llama "next-server"; `^` ancla al inicio de la línea de
  # comandos para no coincidir con el propio shell que ejecuta este script.
  pkill -f "^next-server" 2>/dev/null || true
  for _ in $(seq 1 10); do pgrep -f "^next-server" >/dev/null 2>&1 || break; sleep 1; done
}

cmd_start() {
  cmd_stop
  export_runtime_env
  nohup npx next start -p "$PORT" >".e2e-server.log" 2>&1 &
  echo $! >"$PIDFILE"
  for _ in $(seq 1 40); do curl -s -o /dev/null --noproxy '*' "http://localhost:${PORT}/manifest.webmanifest" && break; sleep 1; done
  echo "Servidor listo en http://localhost:${PORT} (pid $(cat "$PIDFILE"))"
}

case "${1:-}" in
  setup) cmd_setup ;;
  build) cmd_build ;;
  start) cmd_start ;;
  stop)  cmd_stop ;;
  all)   cmd_setup; cmd_build; cmd_start ;;
  *) sed -n '2,16p' "$0"; exit 1 ;;
esac
