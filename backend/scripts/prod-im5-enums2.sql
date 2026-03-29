CREATE TYPE "AccountType" AS ENUM ('DEMO', 'REAL');
ALTER TABLE accounts ALTER COLUMN type TYPE "AccountType" USING type::"AccountType";

CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL');
ALTER TABLE transactions ALTER COLUMN type TYPE "TransactionType" USING type::"TransactionType";
