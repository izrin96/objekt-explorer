/**
 * Checks what `trade_post` must hold whatever a post's pairing is: every have, sale or want list
 * on Trade is in a row, no list is in two rows, and a row holds only its owner's lists, with a
 * want list only where one belongs. The rows are the only place a pairing is stored, so nothing
 * here compares them with a second copy. It also checks that no offer's `post_id` is another
 * person's row.
 *
 * Check 2 stays a check, not a note, until `shared-lists`: the planner holds a list in several
 * rows, but readers still take one row per list, and `planPost` refuses a list in another post.
 *
 * Checks 5 and 6 hold whatever rows a list is in. Check 5 reads each list from its end: its
 * `discoverable` is "on Trade in some row", which `writePosts` derives from the rows. Check 6
 * reads each row against the post rules: no want-side state without a want list, `takes_swaps`
 * only under a sale lead, and, for a list in exactly one row whose side is on, the row's Open to
 * (its open list) and `takes_swaps` (its sale lead) equal the list's, since some reads still take
 * a list's Open to as its post's. Off Trade a row's Open to may lag its list after `list.edit`, so
 * 6's last part reads only sides on Trade. They need migration `trade_post_state`.
 *
 * Check 7 holds whatever the pairing: a hide names a row (`hidden_trade_post.post_id`), and a
 * person never hides their own post, so no hide sits on its hider's own row. It needs migration
 * `hidden_trade_post_by_row`.
 *
 * Two offer counts are printed as notes and never set the exit code: a merge can hand an offer's
 * row to another list, or Edit post swapped or dropped any of the post's lists, and an offer
 * made by the old build after the migration has no post id, so neither is wrong data.
 *
 * Plain reads only, and it refuses to start unless the connection is read-only:
 *
 *   PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
 *
 * Drop the second `--env-file` to read production. Exits 1 when any count is above zero.
 */
import { db } from "@repo/db";
import { type SQL, sql } from "drizzle-orm";

const SAMPLE = 10;

const { rows: mode } = await db.execute<{ transaction_read_only: string }>(
  sql`show transaction_read_only`,
);
if (mode[0]?.transaction_read_only !== "on") {
  console.error(
    "[trade-post-drift] the connection is not read-only; pass PGOPTIONS='-c default_transaction_read_only=on'",
  );
  process.exit(1);
}

/** Each check selects the ids of what is wrong, as `id`. */
const CHECKS: [label: string, query: SQL][] = [
  [
    "a list on Trade that is in no row (list ids)",
    sql`SELECT l.id FROM lists l
        WHERE l.discoverable AND l.list_type IN ('have', 'sale', 'want') AND NOT EXISTS (
          SELECT 1 FROM trade_post tp WHERE l.id IN (tp.lead_list_id, tp.want_list_id))`,
  ],
  [
    "a list in two rows (list ids)",
    sql`SELECT m.id FROM trade_post tp
        CROSS JOIN LATERAL (VALUES (tp.lead_list_id), (tp.want_list_id)) m(id)
        WHERE m.id IS NOT NULL GROUP BY m.id HAVING count(*) > 1`,
  ],
  [
    "a row with another owner's list, a want list that is not one, or a want-led row holding a want list (row ids)",
    sql`SELECT tp.id FROM trade_post tp
        JOIN lists o ON o.id = tp.lead_list_id
        LEFT JOIN lists w ON w.id = tp.want_list_id
        WHERE o.user_id <> tp.user_id OR o.list_type NOT IN ('have', 'sale', 'want')
          OR (w.id IS NOT NULL AND (w.user_id <> tp.user_id OR w.list_type <> 'want'
            OR o.list_type = 'want'))`,
  ],
  [
    "an offer whose post is another person's row (offer ids)",
    sql`SELECT o.id FROM offer o JOIN trade_post tp ON tp.id = o.post_id
        WHERE tp.user_id <> o.to_user_id`,
  ],
  [
    "a list whose Trade state disagrees with its rows (list ids)",
    sql`WITH sides AS (
          SELECT s.list_id, bool_or(s.on_trade) AS on_trade
          FROM trade_post tp
          CROSS JOIN LATERAL (VALUES
            (tp.lead_list_id, tp.lead_on_trade),
            (tp.want_list_id, tp.want_on_trade)
          ) s(list_id, on_trade)
          WHERE s.list_id IS NOT NULL
          GROUP BY s.list_id)
        SELECT l.id FROM lists l LEFT JOIN sides ON sides.list_id = l.id
        WHERE l.list_type IN ('have', 'sale', 'want')
          AND l.discoverable <> coalesce(sides.on_trade, false)`,
  ],
  [
    "a row whose Open to or takes_swaps breaks a post rule (row ids)",
    sql`WITH held AS (
          SELECT s.list_id, count(*) AS rows
          FROM trade_post tp
          CROSS JOIN LATERAL (VALUES (tp.lead_list_id), (tp.want_list_id)) s(list_id)
          WHERE s.list_id IS NOT NULL
          GROUP BY s.list_id)
        SELECT tp.id FROM trade_post tp
        JOIN lists o ON o.id = tp.lead_list_id
        LEFT JOIN lists w ON w.id = tp.want_list_id
        LEFT JOIN held ho ON ho.list_id = o.id
        LEFT JOIN held hw ON hw.list_id = w.id
        WHERE (tp.want_list_id IS NULL AND (tp.want_on_trade OR tp.want_bumped_at IS NOT NULL))
          OR (o.list_type <> 'sale' AND tp.takes_swaps)
          OR (w.id IS NOT NULL AND hw.rows = 1 AND tp.want_on_trade
            AND (tp.match_have <> w.match_have OR tp.match_sale <> w.match_sale))
          OR (w.id IS NULL AND o.list_type = 'want' AND ho.rows = 1 AND tp.lead_on_trade
            AND (tp.match_have <> o.match_have OR tp.match_sale <> o.match_sale))
          OR (o.list_type = 'sale' AND ho.rows = 1 AND tp.lead_on_trade
            AND tp.takes_swaps <> o.takes_swaps)`,
  ],
  [
    "a hide on its hider's own row (row ids)",
    sql`SELECT hp.post_id AS id FROM hidden_trade_post hp
        JOIN trade_post tp ON tp.id = hp.post_id
        WHERE tp.user_id = hp.user_id`,
  ],
];

/** Counted and printed like the checks, but information: they never count as drift. */
const NOTES: [label: string, query: SQL][] = [
  [
    "an offer on a post now led by another list, its own list still there (offer ids)",
    sql`SELECT o.id FROM offer o JOIN trade_post tp ON tp.id = o.post_id
        WHERE o.post_list_id IS NOT NULL AND tp.lead_list_id <> o.post_list_id`,
  ],
  [
    "an offer on a list that leads a row, with no post id (offer ids)",
    sql`SELECT o.id FROM offer o
        WHERE o.post_id IS NULL AND o.post_list_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM trade_post tp WHERE tp.lead_list_id = o.post_list_id)`,
  ],
];

const { rows: total } = await db.execute<{ n: number }>(
  sql`SELECT count(*)::int AS n FROM trade_post`,
);
console.log(`[trade-post-drift] ${total[0]?.n ?? 0} rows in trade_post`);

function report(ids: number[], label: string) {
  const sample = ids.slice(0, SAMPLE);
  console.log(
    `${String(ids.length).padStart(6)}  ${label}${sample.length ? `: ${sample.join(", ")}` : ""}`,
  );
}

let drift = 0;
for (const [label, query] of CHECKS) {
  const { rows } = await db.execute<{ id: number }>(sql`${query} ORDER BY 1`);
  drift += rows.length;
  report(
    rows.map((row) => row.id),
    label,
  );
}

for (const [label, query] of NOTES) {
  const { rows } = await db.execute<{ id: number }>(sql`${query} ORDER BY 1`);
  report(
    rows.map((row) => row.id),
    label,
  );
}

console.log(drift === 0 ? "[trade-post-drift] in step" : `[trade-post-drift] ${drift} out of step`);
process.exit(drift === 0 ? 0 : 1);
