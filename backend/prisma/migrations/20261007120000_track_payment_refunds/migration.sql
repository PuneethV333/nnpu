ALTER TYPE "PaymentStatus" ADD VALUE 'RefundRequired';

ALTER TABLE "Payment"
ADD COLUMN "refundAmount" INTEGER NOT NULL DEFAULT 0;
