-- At most one live payment per invoice.
--
-- createPaymentOrder() used to mint a fresh Razorpay order on every call, so a
-- double tap (or a retry) produced two open orders for the same invoice, each
-- for the full outstanding amount. Both could be paid, pushing Invoice.paidAmount
-- past Invoice.totalAmount and leaving a "Paid" invoice with a negative balance.
--
-- This is the database-level guarantee; reusing the existing order in
-- createPaymentOrder() is the matching application-level fix. Prisma cannot
-- express a partial index in the schema, so it is declared here by hand.
CREATE UNIQUE INDEX "Payment_one_pending_per_invoice"
  ON "Payment" ("invoiceId")
  WHERE "status" = 'Pending';
