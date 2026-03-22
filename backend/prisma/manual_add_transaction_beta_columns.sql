-- BetaTransfer: nullable columns on transactions (safe to run multiple times on PG 9.1+)
-- IF NOT EXISTS for ADD COLUMN requires PostgreSQL 9.1+

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "externalStatus" TEXT;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "cardLastFour" TEXT;
