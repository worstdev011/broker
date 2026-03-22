-- Align users table with schema.prisma for Google OAuth (no other schema changes).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" TEXT;

ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_googleId_key'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_googleId_key" UNIQUE ("googleId");
  END IF;
END $$;
