-- Legacy im5 -> current Prisma schema bridge (PostgreSQL). Run: psql -d im5 -f prod-im5-upgrade.sql
-- Creates enums and alters existing tables. Then: npm run db:seed && npx prisma db push

-- Enums used by ALTERs (db push will create the rest)
DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InstrumentType" AS ENUM ('REAL', 'OTC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- users.display_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_id integer;
WITH numbered AS (SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn FROM users)
UPDATE users u SET display_id = numbered.rn FROM numbered WHERE u.id = numbered.id AND u.display_id IS NULL;
CREATE SEQUENCE IF NOT EXISTS users_display_id_seq;
SELECT setval('users_display_id_seq', (SELECT COALESCE(MAX(display_id), 1) FROM users));
ALTER TABLE users ALTER COLUMN display_id SET DEFAULT nextval('users_display_id_seq');
UPDATE users SET display_id = nextval('users_display_id_seq') WHERE display_id IS NULL;
ALTER TABLE users ALTER COLUMN display_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_display_id_key ON users(display_id);
ALTER SEQUENCE users_display_id_seq OWNED BY users.display_id;

-- users.role / isActive / partnerId
ALTER TABLE users ADD COLUMN IF NOT EXISTS role "Role" NOT NULL DEFAULT 'USER';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "partnerId" TEXT;

-- kycStatus: text -> enum (once)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'kycStatus' AND udt_name = 'text'
  ) THEN
    ALTER TABLE users ADD COLUMN "kycStatus_tmp" "KycStatus";
    UPDATE users SET "kycStatus_tmp" = CASE
      WHEN TRIM(COALESCE("kycStatus", '')) = '' THEN NULL
      WHEN LOWER(TRIM("kycStatus")) = 'verified' THEN 'VERIFIED'::"KycStatus"
      WHEN LOWER(TRIM("kycStatus")) = 'pending' THEN 'PENDING'::"KycStatus"
      WHEN LOWER(TRIM("kycStatus")) = 'rejected' THEN 'REJECTED'::"KycStatus"
      ELSE NULL
    END;
    ALTER TABLE users DROP COLUMN "kycStatus";
    ALTER TABLE users RENAME COLUMN "kycStatus_tmp" TO "kycStatus";
  END IF;
END $$;

-- transactions: paymentMethod enum -> text; drop provider; add failureReason
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'paymentMethod' AND udt_name <> 'text'
  ) THEN
    ALTER TABLE transactions ADD COLUMN "paymentMethod_txt" text;
    UPDATE transactions SET "paymentMethod_txt" = "paymentMethod"::text;
    ALTER TABLE transactions DROP COLUMN "paymentMethod";
    ALTER TABLE transactions RENAME COLUMN "paymentMethod_txt" TO "paymentMethod";
    ALTER TABLE transactions ALTER COLUMN "paymentMethod" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "failureReason" text;
ALTER TABLE transactions DROP COLUMN IF EXISTS provider;

-- instruments: type + sortOrder
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS type "InstrumentType" NOT NULL DEFAULT 'OTC';
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS "sortOrder" integer NOT NULL DEFAULT 0;

-- trades: new columns; rename payout; drop legacy instrument
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'instrument'
  ) THEN
    ALTER TABLE trades ADD COLUMN IF NOT EXISTS "instrumentId" text;
    UPDATE trades SET "instrumentId" = instrument WHERE "instrumentId" IS NULL;
    ALTER TABLE trades ADD COLUMN IF NOT EXISTS "payoutPercent" integer;
    UPDATE trades SET "payoutPercent" = 75 WHERE "payoutPercent" IS NULL;
    ALTER TABLE trades ALTER COLUMN "payoutPercent" SET NOT NULL;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'payout'
    ) THEN
      ALTER TABLE trades RENAME COLUMN payout TO "payoutAmount";
    END IF;
    ALTER TABLE trades ADD COLUMN IF NOT EXISTS "idempotencyKey" text;
    ALTER TABLE trades DROP COLUMN instrument;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS trades_idempotency_key_key ON trades("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
