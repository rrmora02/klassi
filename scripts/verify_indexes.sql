-- ============================================================================
-- Verificación de índices creados en add_performance_indexes.sql
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

SELECT
  t.relname AS tabla,
  i.relname AS indice,
  ix.indisunique AS es_unico,
  array_to_string(array_agg(a.attname ORDER BY x.n), ', ') AS columnas
FROM
  pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
  JOIN generate_subscripts(ix.indkey, 1) AS x(n) ON a.attnum = ix.indkey[x.n]
WHERE
  t.relname IN (
    'User', 'TenantUser', 'TeamInvitation', 'Instructor',
    'Group', 'Student', 'Enrollment', 'ClassSession',
    'Attendance', 'Payment'
  )
  AND t.relkind = 'r'
GROUP BY
  t.relname, i.relname, ix.indisunique
ORDER BY
  t.relname, i.relname;
