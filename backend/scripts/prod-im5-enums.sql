-- Part 2: normalize AccountType / TransactionType enums for Prisma (after prod-im5-upgrade.sql)

-- accounts.type: demo/real -> DEMO/REAL
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "type_new" text;
UPDATE accounts SET "type_new" = CASE type::text WHEN 'demo' THEN 'DEMO' WHEN 'real' THEN 'REAL' ELSE UPPER(type::text) END;
ALTER TABLE accounts DROP COLUMN type;
ALTER TABLE accounts RENAME COLUMN "type_new" TO type;
DROP TYPE IF EXISTS "AccountType";

-- transactions.type: map legacy enum labels to Prisma set
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "type_new" text;
UPDATE transactions SET "type_new" = CASE type::text
  WHEN 'DEPOSIT' THEN 'DEPOSIT'
  WHEN 'WITHDRAW' THEN 'WITHDRAWAL'
  WHEN 'TRADE_RESULT' THEN 'DEPOSIT'
  WHEN 'BONUS' THEN 'DEPOSIT'
  ELSE 'DEPOSIT'
END;
ALTER TABLE transactions DROP COLUMN type;
ALTER TABLE transactions RENAME COLUMN "type_new" TO type;
DROP TYPE IF EXISTS "TransactionType";
