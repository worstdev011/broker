-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PartnerEventType" AS ENUM ('REGISTRATION', 'FTD', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "PartnerWithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "partnerId" TEXT;

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "telegramHandle" TEXT,
    "refCode" TEXT NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "revsharePercent" INTEGER NOT NULL DEFAULT 50,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_clicks" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_events" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PartnerEventType" NOT NULL,
    "amount" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_earnings" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_withdrawals" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "PartnerWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "partner_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_sessions" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partners_email_key" ON "partners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "partners_refCode_key" ON "partners"("refCode");

-- CreateIndex
CREATE INDEX "partner_clicks_partnerId_createdAt_idx" ON "partner_clicks"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "partner_events_partnerId_type_createdAt_idx" ON "partner_events"("partnerId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "partner_events_userId_idx" ON "partner_events"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_earnings_tradeId_key" ON "partner_earnings"("tradeId");

-- CreateIndex
CREATE INDEX "partner_earnings_partnerId_createdAt_idx" ON "partner_earnings"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "partner_withdrawals_partnerId_status_idx" ON "partner_withdrawals"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "partner_sessions_tokenHash_key" ON "partner_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "partner_sessions_partnerId_idx" ON "partner_sessions"("partnerId");

-- CreateIndex
CREATE INDEX "users_partnerId_idx" ON "users"("partnerId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_clicks" ADD CONSTRAINT "partner_clicks_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_events" ADD CONSTRAINT "partner_events_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_events" ADD CONSTRAINT "partner_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_earnings" ADD CONSTRAINT "partner_earnings_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_earnings" ADD CONSTRAINT "partner_earnings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_withdrawals" ADD CONSTRAINT "partner_withdrawals_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_sessions" ADD CONSTRAINT "partner_sessions_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
