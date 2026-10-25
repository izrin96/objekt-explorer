-- A paired want list is someone trading, so it is Swaps only; an unpaired one is Buying only.
UPDATE "lists" SET "match_sale" = false, "match_have" = true
WHERE "list_type_new" = 'want' AND "linked_list_id" IS NOT NULL;--> statement-breakpoint
UPDATE "lists" SET "match_sale" = true, "match_have" = false
WHERE "list_type_new" = 'want' AND "linked_list_id" IS NULL;
