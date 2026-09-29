-- A bill is the payable unit.  Group charges create one bill per member, while
-- a bill without a group is a direct person-to-person debt.
ALTER TABLE "bills" ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "bills" ADD COLUMN "paid_at" TIMESTAMP(3);
ALTER TABLE "bills" ALTER COLUMN "group_id" DROP NOT NULL;

-- Make previously recorded group charges payable one at a time.  A deterministic
-- id makes this migration safe to rerun in a restored database.
INSERT INTO "bills" ("id", "group_id", "person_id", "amount", "description", "payment_status", "created_at", "updated_at")
SELECT md5(gc."id" || ':' || gm."person_id"), gc."group_id", gm."person_id", gc."amount_per_person", gc."description", 'PENDING', gc."created_at", gc."created_at"
FROM "group_charges" gc
JOIN "group_members" gm ON gm."group_id" = gc."group_id"
ON CONFLICT ("id") DO NOTHING;

CREATE INDEX "bills_person_id_payment_status_idx" ON "bills"("person_id", "payment_status");
CREATE INDEX "bills_group_id_person_id_payment_status_idx" ON "bills"("group_id", "person_id", "payment_status");
