-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Market" AS ENUM ('INDIA', 'US', 'CRYPTO');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('ACTIVE', 'TARGET_HIT', 'STOP_HIT', 'EXPIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BrokerStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTING', 'CONNECTED', 'EXPIRED', 'RECONNECT_REQUIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "PaperOrderStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaperTradeStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "countryCode" VARCHAR(8) NOT NULL,
    "mobile" VARCHAR(20) NOT NULL,
    "mobileNormalized" VARCHAR(24) NOT NULL,
    "mobileVerifiedAt" TIMESTAMP(3) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" VARCHAR(512),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" UUID NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'DARK',
    "signalNotifications" BOOLEAN NOT NULL DEFAULT true,
    "signalSound" BOOLEAN NOT NULL DEFAULT false,
    "soundEffects" BOOLEAN NOT NULL DEFAULT false,
    "signalHistory" BOOLEAN NOT NULL DEFAULT true,
    "defaultMarket" "Market" NOT NULL DEFAULT 'INDIA',
    "defaultTimeframe" VARCHAR(16) NOT NULL DEFAULT '15m',
    "riskPercentage" DECIMAL(6,3) NOT NULL DEFAULT 1,
    "paperTradingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" VARCHAR(80) NOT NULL,
    "version" VARCHAR(24) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "market" "Market" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id","version")
);

-- CreateTable
CREATE TABLE "UserStrategy" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "strategyId" VARCHAR(80) NOT NULL,
    "strategyVersion" VARCHAR(24) NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" VARCHAR(180) NOT NULL,
    "strategyId" VARCHAR(80) NOT NULL,
    "strategyVersion" VARCHAR(24) NOT NULL,
    "market" "Market" NOT NULL,
    "exchange" VARCHAR(40) NOT NULL,
    "symbol" VARCHAR(80) NOT NULL,
    "timeframe" VARCHAR(16) NOT NULL,
    "direction" "Direction" NOT NULL,
    "optionSide" VARCHAR(12),
    "entry" DECIMAL(24,8) NOT NULL,
    "stopLoss" DECIMAL(24,8) NOT NULL,
    "target" DECIMAL(24,8) NOT NULL,
    "riskReward" DECIMAL(12,6) NOT NULL,
    "agreementScore" INTEGER NOT NULL,
    "calibratedProbability" DECIMAL(7,6),
    "rsi" DECIMAL(12,6),
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "status" "SignalStatus" NOT NULL DEFAULT 'ACTIVE',
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyPerformance" (
    "id" UUID NOT NULL,
    "strategyId" VARCHAR(80) NOT NULL,
    "strategyVersion" VARCHAR(24) NOT NULL,
    "symbol" VARCHAR(80) NOT NULL,
    "timeframe" VARCHAR(16) NOT NULL,
    "window" VARCHAR(80) NOT NULL,
    "totalTrades" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "winRate" DECIMAL(7,4) NOT NULL,
    "profitFactor" DECIMAL(16,6) NOT NULL,
    "expectancy" DECIMAL(24,8) NOT NULL,
    "averageRR" DECIMAL(12,6) NOT NULL,
    "maxDrawdown" DECIMAL(12,6) NOT NULL,
    "returnPct" DECIMAL(16,6) NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "broker" VARCHAR(40) NOT NULL,
    "status" "BrokerStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "externalAccountId" VARCHAR(160),
    "tokenReference" VARCHAR(255),
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balance" DECIMAL(24,8) NOT NULL,
    "initialBalance" DECIMAL(24,8) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperOrder" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "symbol" VARCHAR(80) NOT NULL,
    "direction" "Direction" NOT NULL,
    "orderType" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "limitPrice" DECIMAL(24,8),
    "fillPrice" DECIMAL(24,8),
    "status" "PaperOrderStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperTrade" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "signalId" VARCHAR(180),
    "symbol" VARCHAR(80) NOT NULL,
    "direction" "Direction" NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "entryPrice" DECIMAL(24,8) NOT NULL,
    "exitPrice" DECIMAL(24,8),
    "stopLoss" DECIMAL(24,8),
    "target" DECIMAL(24,8),
    "realizedPnl" DECIMAL(24,8),
    "status" "PaperTradeStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileNormalized_key" ON "User"("mobileNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Strategy_market_enabled_idx" ON "Strategy"("market", "enabled");

-- CreateIndex
CREATE INDEX "UserStrategy_userId_applied_idx" ON "UserStrategy"("userId", "applied");

-- CreateIndex
CREATE INDEX "UserStrategy_userId_favorite_idx" ON "UserStrategy"("userId", "favorite");

-- CreateIndex
CREATE UNIQUE INDEX "UserStrategy_userId_strategyId_strategyVersion_key" ON "UserStrategy"("userId", "strategyId", "strategyVersion");

-- CreateIndex
CREATE INDEX "Signal_generatedAt_idx" ON "Signal"("generatedAt" DESC);

-- CreateIndex
CREATE INDEX "Signal_strategyId_strategyVersion_generatedAt_idx" ON "Signal"("strategyId", "strategyVersion", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "Signal_symbol_timeframe_generatedAt_idx" ON "Signal"("symbol", "timeframe", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "Signal_status_generatedAt_idx" ON "Signal"("status", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "Signal_market_direction_generatedAt_idx" ON "Signal"("market", "direction", "generatedAt" DESC);

-- CreateIndex
CREATE INDEX "StrategyPerformance_calculatedAt_idx" ON "StrategyPerformance"("calculatedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StrategyPerformance_strategyId_strategyVersion_symbol_timef_key" ON "StrategyPerformance"("strategyId", "strategyVersion", "symbol", "timeframe", "window");

-- CreateIndex
CREATE INDEX "BrokerConnection_status_expiresAt_idx" ON "BrokerConnection"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerConnection_userId_broker_key" ON "BrokerConnection"("userId", "broker");

-- CreateIndex
CREATE UNIQUE INDEX "PaperAccount_userId_key" ON "PaperAccount"("userId");

-- CreateIndex
CREATE INDEX "PaperOrder_accountId_submittedAt_idx" ON "PaperOrder"("accountId", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "PaperOrder_status_idx" ON "PaperOrder"("status");

-- CreateIndex
CREATE INDEX "PaperTrade_accountId_status_idx" ON "PaperTrade"("accountId", "status");

-- CreateIndex
CREATE INDEX "PaperTrade_openedAt_idx" ON "PaperTrade"("openedAt" DESC);

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStrategy" ADD CONSTRAINT "UserStrategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStrategy" ADD CONSTRAINT "UserStrategy_strategyId_strategyVersion_fkey" FOREIGN KEY ("strategyId", "strategyVersion") REFERENCES "Strategy"("id", "version") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_strategyId_strategyVersion_fkey" FOREIGN KEY ("strategyId", "strategyVersion") REFERENCES "Strategy"("id", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyPerformance" ADD CONSTRAINT "StrategyPerformance_strategyId_strategyVersion_fkey" FOREIGN KEY ("strategyId", "strategyVersion") REFERENCES "Strategy"("id", "version") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerConnection" ADD CONSTRAINT "BrokerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAccount" ADD CONSTRAINT "PaperAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperOrder" ADD CONSTRAINT "PaperOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PaperAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperTrade" ADD CONSTRAINT "PaperTrade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PaperAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
