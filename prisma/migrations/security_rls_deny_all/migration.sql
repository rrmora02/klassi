-- Defensa en profundidad (Supabase): activar RLS en TODAS las tablas del esquema
-- `public`, sin políticas. Klassi accede a Postgres solo con Prisma desde el
-- servidor, con el rol dueño de las tablas / `postgres` (BYPASSRLS), así que la
-- aplicación NO se ve afectada. En cambio, la Data API de Supabase (PostgREST)
-- con la clave `anon`/`authenticated` queda sin acceso a ninguna fila
-- (deny-all) aunque alguien obtenga esas claves públicas.
--
-- Precondición antes de aplicar en producción: el usuario de DATABASE_URL debe
-- ser dueño de las tablas o tener BYPASSRLS (en Supabase: `postgres`).
--   SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = current_user;
--
-- Idempotente y reversible: ALTER TABLE ... DISABLE ROW LEVEL SECURITY.
-- Las tablas nuevas deben activar RLS en su propia migración.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
