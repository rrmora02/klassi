-- Fase 2 de auditoría de seguridad
-- Aplicar con: npx prisma db push  (o ejecutar este SQL directo en Supabase)

-- Idempotencia de webhooks de Stripe (dedupe por event.id)
CREATE TABLE "StripeEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- Un invoice de Stripe = un registro de Subscription (evita duplicados por retries)
CREATE UNIQUE INDEX "Subscription_stripeInvoiceId_key" ON "Subscription"("stripeInvoiceId");

-- Token opaco para el link público de historial del alumno
-- (los links viejos /alumno/<id-del-alumno> dejan de funcionar a propósito)
ALTER TABLE "Student" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Student_shareToken_key" ON "Student"("shareToken");
