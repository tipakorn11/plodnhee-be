-- Group detail endpoints filter by group and return history in creation order.
-- Composite indexes avoid a table scan and explicit sort as those histories grow.
CREATE INDEX "group_members_group_id_created_at_idx" ON "group_members"("group_id", "created_at");
CREATE INDEX "group_charges_group_id_created_at_idx" ON "group_charges"("group_id", "created_at");
CREATE INDEX "member_discounts_group_id_created_at_idx" ON "member_discounts"("group_id", "created_at");
CREATE INDEX "bills_group_id_created_at_idx" ON "bills"("group_id", "created_at");
