INSERT INTO "address_link_event" ("address", "user_id", "event", "reason", "created_at")
SELECT DISTINCT ON (src."address", src."user_id")
	src."address", src."user_id", 'linked', 'backfill', src."at"
FROM (
	SELECT ua."address"::citext AS "address", ua."user_id", coalesce(ua."linked_at", now()) AS "at"
	FROM "user_address" ua
	WHERE ua."user_id" IS NOT NULL
	UNION ALL
	SELECT lower(a)::citext, l."from_user_id", t."accepted_at"
	FROM "trade_leg" l
	JOIN "trade" t ON t."id" = l."trade_id"
	CROSS JOIN LATERAL unnest(l."from_addresses") AS a
	UNION ALL
	SELECT lower(a)::citext, l."to_user_id", t."accepted_at"
	FROM "trade_leg" l
	JOIN "trade" t ON t."id" = l."trade_id"
	CROSS JOIN LATERAL unnest(l."to_addresses") AS a
) src
WHERE NOT EXISTS (
	SELECT 1 FROM "address_link_event" e
	WHERE e."address" = src."address" AND e."user_id" = src."user_id" AND e."reason" = 'backfill'
)
ORDER BY src."address", src."user_id", src."at";
