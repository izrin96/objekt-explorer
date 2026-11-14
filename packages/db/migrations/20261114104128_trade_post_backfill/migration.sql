SET LOCAL lock_timeout = '5s';--> statement-breakpoint
-- The backfill trusts every link to be a mutual have-or-sale to want pair of one owner. All of
-- these were zero on production on 2026-11-14; a failure here rolls back the table too.
DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*) INTO n FROM lists a JOIN lists b ON b.id = a.linked_list_id
  WHERE a.user_id <> b.user_id OR (a.list_type = 'want') = (b.list_type = 'want');
  IF n > 0 THEN RAISE EXCEPTION 'trade_post backfill: % links to another owner or to the same side', n; END IF;

  SELECT count(*) INTO n FROM lists a LEFT JOIN lists b ON b.id = a.linked_list_id
  WHERE a.linked_list_id IS NOT NULL AND b.linked_list_id IS DISTINCT FROM a.id;
  IF n > 0 THEN RAISE EXCEPTION 'trade_post backfill: % links that are not mutual', n; END IF;

  SELECT count(*) INTO n FROM lists a JOIN lists b ON b.id = a.linked_list_id
  WHERE a.list_type = 'general' OR b.list_type = 'general';
  IF n > 0 THEN RAISE EXCEPTION 'trade_post backfill: % links from or to a general list', n; END IF;

  SELECT count(*) INTO n FROM lists
  WHERE list_type = 'sale' AND linked_list_id IS NOT NULL AND NOT takes_swaps;
  IF n > 0 THEN RAISE EXCEPTION 'trade_post backfill: % linked sale lists without takes_swaps', n; END IF;

  SELECT count(*) INTO n FROM (
    SELECT linked_list_id FROM lists
    WHERE linked_list_id IS NOT NULL AND list_type IN ('have', 'sale')
    GROUP BY linked_list_id HAVING count(*) > 1
  ) twice;
  IF n > 0 THEN RAISE EXCEPTION 'trade_post backfill: % want lists named by two links', n; END IF;
END $$;--> statement-breakpoint
-- a have or sale list that is linked or on Trade leads a row; its linked want list joins it
INSERT INTO trade_post (user_id, lead_list_id, want_list_id)
SELECT o.user_id, o.id, w.id
FROM lists o LEFT JOIN lists w ON w.id = o.linked_list_id AND w.list_type = 'want'
WHERE o.list_type IN ('have', 'sale') AND (o.linked_list_id IS NOT NULL OR o.discoverable)
ORDER BY o.id;--> statement-breakpoint
-- a want list on Trade that no have or sale list links to is a Buy post
INSERT INTO trade_post (user_id, lead_list_id)
SELECT w.user_id, w.id FROM lists w
WHERE w.list_type = 'want' AND w.discoverable
  AND NOT EXISTS (
    SELECT 1 FROM lists o WHERE o.linked_list_id = w.id AND o.list_type IN ('have', 'sale')
  )
ORDER BY w.id;
