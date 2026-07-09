-- CreateEnum
CREATE TYPE "NftStatus" AS ENUM ('LISTED', 'SOLD', 'DELISTED');

-- CreateTable
CREATE TABLE "nfts" (
    "id" UUID NOT NULL,
    "mint_address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "image" TEXT NOT NULL,
    "metadata_uri" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "price_lamports" TEXT NOT NULL,
    "status" "NftStatus" NOT NULL DEFAULT 'LISTED',
    "tx_signature" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nfts_mint_address_key" ON "nfts"("mint_address");

-- CreateIndex
CREATE INDEX "nfts_status_idx" ON "nfts"("status");
