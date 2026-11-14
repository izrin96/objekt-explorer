/**
 * Checks that `trade_post` says what `lists` says: every link and every list on Trade has its
 * row, and no row says more. Nothing reads `trade_post` yet, so drift harms no one, but the
 * change that moves the reads onto it needs every count here at zero first.
 *
 * Plain reads only, and it refuses to start unless the connection is read-only:
 *
 *   PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
 *
 * Drop the second `--env-file` to read production. Right after a deploy, expect drift for the
 * people who posted while the build before `trade_post` was live; their next write clears it.
 * Exits 1 when any count is above zero.
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

const offering = sql`o.list_type IN ('have', 'sale')`;

/** Each check selects the ids of what is wrong, as `id`. */
const CHECKS: [label: string, query: SQL][] = [
  [
    "a have or sale list linked to a want list, with no row holding the pair (list ids)",
    sql`SELECT o.id FROM lists o JOIN lists w ON w.id = o.linked_list_id AND w.list_type = 'want'
        WHERE ${offering} AND NOT EXISTS (
          SELECT 1 FROM trade_post tp WHERE tp.lead_list_id = o.id AND tp.want_list_id = w.id)`,
  ],
  [
    "a row whose want list differs from its lead's link (row ids)",
    sql`SELECT tp.id FROM trade_post tp JOIN lists o ON o.id = tp.lead_list_id
        WHERE ${offering} AND tp.want_list_id IS DISTINCT FROM o.linked_list_id`,
  ],
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
    "a row led by a want list that a have or sale list links to (row ids)",
    sql`SELECT tp.id FROM trade_post tp JOIN lists w ON w.id = tp.lead_list_id
        WHERE w.list_type = 'want' AND EXISTS (
          SELECT 1 FROM lists o WHERE o.linked_list_id = w.id AND ${offering})`,
  ],
];

const { rows: total } = await db.execute<{ n: number }>(
  sql`SELECT count(*)::int AS n FROM trade_post`,
);
console.log(`[trade-post-drift] ${total[0]?.n ?? 0} rows in trade_post`);

let drift = 0;
for (const [label, query] of CHECKS) {
  const { rows } = await db.execute<{ id: number }>(sql`${query} ORDER BY 1`);
  drift += rows.length;
  const sample = rows.slice(0, SAMPLE).map((row) => row.id);
  console.log(
    `${String(rows.length).padStart(6)}  ${label}${sample.length ? `: ${sample.join(", ")}` : ""}`,
  );
}

console.log(drift === 0 ? "[trade-post-drift] in step" : `[trade-post-drift] ${drift} out of step`);
process.exit(drift === 0 ? 0 : 1);
