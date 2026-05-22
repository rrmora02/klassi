-- Enable slow query logging in PostgreSQL
-- Run this SQL against your Klassi database

-- Set minimum duration for slow query logging (100ms)
ALTER SYSTEM SET log_min_duration_statement = 100;

-- Enable query logging parameters
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Enable table/index stats (for performance analysis)
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;

-- Reload PostgreSQL configuration
SELECT pg_reload_conf();

-- Verify settings
SELECT name, setting FROM pg_settings
WHERE name IN ('log_min_duration_statement', 'log_statement', 'log_duration');

-- Check pg_stat_statements (if installed)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements
-- ORDER BY mean_exec_time DESC LIMIT 20;
