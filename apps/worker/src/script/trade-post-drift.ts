/**
 * Checks that `trade_post` says what `lists` says: every link and every list on Trade has its
 * row, and no row says more. Posts, pairs and partners are read from the rows while writers
 * still derive them from `lists.linked_list_id`, so drift changes what people see.
 *
 * From the seventh check on, each compares a read over the rows with the read over the link it
 * replaced; the legacy SQL lives only here. They go when `trade-post-contract` drops the link.
 *
 * Plain reads only, and it refuses to start unless the connection is read-only:
 *
 *   PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
 *
 * Drop the second `--env-file` to read production. Exits 1 when any count is above zero.
 * `EXPLAIN=1` prints the plans of the legacy and the new statements instead.
 */
import { column, offersSwapsSql } from "@repo/api/lib/trade-sql";
import { listedPost, postsCte } from "@repo/api/services/trade/feed/query";
import {
  hidesOfSql,
  matchableListSql,
  postPairsSql,
  postPartnerSql,
} from "@repo/api/services/trade/lists";
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

const legacyLeadsPair = (offer: string, want: string) =>
  sql`(${column(want, "list_type")} = 'want'
    AND ${column(offer, "linked_list_id")} = ${column(want, "id")}
    AND ${column(offer, "user_id")} = ${column(want, "user_id")}
    AND ${offersSwapsSql(offer)})`;

const legacyPostsCte = sql`
  legacy_on_trade AS (
    SELECT id, user_id, list_type, linked_list_id, match_sale, match_have, takes_swaps, bumped_at,
      updated_at, created_at
    FROM lists
    WHERE discoverable AND ${matchableListSql()}
  ),
  legacy_posts AS (
    SELECT
      a.id,
      a.user_id,
      a.list_type AS type,
      a.match_sale,
      a.match_have,
      a.takes_swaps,
      p.id AS partner_id,
      p.match_sale AS partner_match_sale,
      p.match_have AS partner_match_have,
      date_trunc(
        'milliseconds',
        coalesce(greatest(a.bumped_at, p.bumped_at), greatest(a.updated_at, p.updated_at))
      ) AS bumped_at,
      greatest(a.updated_at, p.updated_at) AS updated_at
    FROM legacy_on_trade a
    LEFT JOIN legacy_on_trade p ON ${legacyLeadsPair("a", "p")}
    WHERE NOT EXISTS (SELECT 1 FROM legacy_on_trade h WHERE ${legacyLeadsPair("h", "a")})
  )
`;

const legacyHidesOf = (viewer: SQL, alias: string) =>
  sql`FROM hidden_trade_post legacy_hp
    WHERE legacy_hp.user_id = ${viewer}
      AND (legacy_hp.list_id = ${column(alias, "id")}
        OR legacy_hp.list_id IN (
          SELECT legacy_lead.id FROM lists legacy_lead WHERE ${legacyLeadsPair("legacy_lead", alias)}))`;

const legacyPairs = sql`SELECT o.id, w.id AS want_id FROM lists o JOIN lists w ON ${legacyLeadsPair("o", "w")}`;
const rowPairs = sql`SELECT o.id, w.id AS want_id FROM trade_post tp
  JOIN lists o ON o.id = tp.lead_list_id JOIN lists w ON ${postPairsSql("tp", "o", "w")}`;

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
  [
    "a list whose partner by its row differs from its link (list ids)",
    sql`SELECT l.id FROM lists l WHERE ${postPartnerSql("l")} IS DISTINCT FROM l.linked_list_id`,
  ],
  [
    "a post by the link that the rows lack or change (anchor ids)",
    sql`SELECT d.id FROM (
          WITH ${postsCte}, ${legacyPostsCte}
          SELECT * FROM legacy_posts EXCEPT ALL SELECT * FROM posts) d`,
  ],
  [
    "a post by the rows that the link lacks or changes (anchor ids)",
    sql`SELECT d.id FROM (
          WITH ${postsCte}, ${legacyPostsCte}
          SELECT * FROM posts EXCEPT ALL SELECT * FROM legacy_posts) d`,
  ],
  [
    "a pair the link and the rows do not both make, on Trade or off (lead ids)",
    sql`SELECT d.id FROM (
          (${legacyPairs} EXCEPT ALL ${rowPairs}) UNION ALL (${rowPairs} EXCEPT ALL ${legacyPairs})
        ) d`,
  ],
  [
    "a list one hide rule hides from its hider and the other does not (list ids)",
    // a hide reaches its own list and the want list its list leads, by the link or by the row
    sql`SELECT cand.id FROM (
          SELECT hp.user_id, hp.list_id AS id FROM hidden_trade_post hp
          UNION
          SELECT hp.user_id, l.linked_list_id FROM hidden_trade_post hp
            JOIN lists l ON l.id = hp.list_id WHERE l.linked_list_id IS NOT NULL
          UNION
          SELECT hp.user_id, tp.want_list_id FROM hidden_trade_post hp
            JOIN trade_post tp ON tp.lead_list_id = hp.list_id WHERE tp.want_list_id IS NOT NULL
        ) cand
        JOIN lists l ON l.id = cand.id
        WHERE EXISTS (SELECT 1 ${hidesOfSql(sql`cand.user_id`, "l")})
          IS DISTINCT FROM EXISTS (SELECT 1 ${legacyHidesOf(sql`cand.user_id`, "l")})`,
  ],
];

if (process.env.EXPLAIN === "1") {
  const listedCount = (cte: SQL, name: string) =>
    sql`WITH ${cte}, counted AS (
          SELECT 1 FROM ${sql.raw(name)} posts WHERE ${listedPost}
        ) SELECT count(*) FROM counted`;
  const { rows: hiders } = await db.execute<{ user_id: string }>(
    sql`SELECT user_id FROM hidden_trade_post GROUP BY user_id ORDER BY count(*) DESC LIMIT 1`,
  );
  const hider = hiders[0]?.user_id;
  const hiddenCount = (hides: SQL) =>
    sql`SELECT count(*) FROM lists l WHERE l.discoverable AND NOT EXISTS (SELECT 1 ${hides})`;
  const plans: [label: string, query: SQL][] = [
    ["listed posts, by the link", listedCount(legacyPostsCte, "legacy_posts")],
    ["listed posts, by the rows", listedCount(postsCte, "posts")],
    ["pairs, by the link", sql`SELECT count(*) FROM (${legacyPairs}) pairs`],
    ["pairs, by the rows", sql`SELECT count(*) FROM (${rowPairs}) pairs`],
  ];
  if (hider) {
    plans.push(
      ["lists not hidden, by the link", hiddenCount(legacyHidesOf(sql`${hider}`, "l"))],
      ["lists not hidden, by the rows", hiddenCount(hidesOfSql(hider, "l"))],
    );
  } else {
    console.log("[trade-post-drift] no hides here, so the hide rule has no plan to show");
  }
  for (const [label, query] of plans) {
    const { rows } = await db.execute<{ "QUERY PLAN": string }>(
      sql`EXPLAIN (ANALYZE, BUFFERS) ${query}`,
    );
    console.log(`\n== ${label}\n${rows.map((row) => row["QUERY PLAN"]).join("\n")}`);
  }
  process.exit(0);
}

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

// the relations `PublicList.linkedList` is read through, with the partner rule of
// `services/list/read.ts` inlined: that module's imports reach `env.ts`
const related = await db.query.lists.findMany({
  columns: { id: true, linkedListId: true },
  with: {
    postLed: { columns: { wantListId: true }, orderBy: { id: "asc" } },
    postWanted: { columns: { leadListId: true }, orderBy: { id: "asc" } },
  },
  orderBy: { id: "asc" },
});
const unrelated = related
  .filter(
    (list) =>
      (list.postLed?.wantListId ?? list.postWanted?.leadListId ?? null) !== list.linkedListId,
  )
  .map((list) => list.id);
drift += unrelated.length;
report(unrelated, "a list whose partner by its relations differs from its link (list ids)");

console.log(drift === 0 ? "[trade-post-drift] in step" : `[trade-post-drift] ${drift} out of step`);
process.exit(drift === 0 ? 0 : 1);
