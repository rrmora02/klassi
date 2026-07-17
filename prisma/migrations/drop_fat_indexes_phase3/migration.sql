-- Fase 3 de auditoría (rendimiento)
-- Aplicar con: npx prisma db push  (o ejecutar este SQL directo en Supabase)
--
-- Estos 4 índices "covering" incluían columnas Json/TEXT largas: cada entrada
-- de B-tree en Postgres tiene un límite de ~2.7 KB, por lo que un stack trace
-- o un diff de auditoría grande hacía FALLAR el INSERT. Además inflaban cada
-- escritura y el planner rara vez los usaba (los compuestos cortos existentes
-- cubren los mismos filtros).

DROP INDEX IF EXISTS "Payment_tenantId_status_dueDate_id_concept_amount_createdAt_idx";
DROP INDEX IF EXISTS "Student_tenantId_lastName_firstName_id_email_phone_status_c_idx";
DROP INDEX IF EXISTS "AuditLog_tenantId_createdAt_id_userId_action_entity_descrip_idx";
DROP INDEX IF EXISTS "ErrorLog_tenantId_severity_createdAt_id_resolved_message_er_idx";
