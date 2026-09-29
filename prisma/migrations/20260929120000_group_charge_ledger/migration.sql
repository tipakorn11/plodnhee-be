CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

ALTER TABLE "groups" ADD COLUMN "total_owed" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "group_members" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "person_id" TEXT NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "group_charges" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "amount_per_person" DECIMAL(12,2) NOT NULL,
  "description" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "group_charges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_discounts" (
  "id" TEXT NOT NULL,
  "group_id" TEXT NOT NULL,
  "person_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_discounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "group_members_group_id_person_id_key" ON "group_members"("group_id", "person_id");
CREATE INDEX "group_members_person_id_idx" ON "group_members"("person_id");
CREATE INDEX "group_charges_group_id_idx" ON "group_charges"("group_id");
CREATE INDEX "member_discounts_group_id_idx" ON "member_discounts"("group_id");
CREATE INDEX "member_discounts_person_id_idx" ON "member_discounts"("person_id");

ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "group_charges" ADD CONSTRAINT "group_charges_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_discounts" ADD CONSTRAINT "member_discounts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_discounts" ADD CONSTRAINT "member_discounts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep existing groups usable after the migration: their historical bill people
-- become members and their stored total agrees with the old bill-only view.
INSERT INTO "group_members" ("id", "group_id", "person_id")
SELECT md5("group_id" || ':' || "person_id"), "group_id", "person_id"
FROM "bills"
GROUP BY "group_id", "person_id"
ON CONFLICT ("group_id", "person_id") DO NOTHING;

UPDATE "groups" g
SET "total_owed" = COALESCE((SELECT SUM(b.amount) FROM "bills" b WHERE b."group_id" = g."id"), 0);
