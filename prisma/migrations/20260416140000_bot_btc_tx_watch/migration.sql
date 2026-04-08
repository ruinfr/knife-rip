CREATE TABLE "BotBtcTxWatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guildId" TEXT,
    "channelId" TEXT,
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotBtcTxWatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BotBtcTxWatch_userId_txHash_key" ON "BotBtcTxWatch"("userId", "txHash");
CREATE INDEX "BotBtcTxWatch_txHash_idx" ON "BotBtcTxWatch"("txHash");
