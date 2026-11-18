/**
 * One-off: judge again the `cosmo_objekt` reads of online objekts that were recorded before
 * online collections could hold confirmed serials, so they count without waiting for each
 * account's next sync. A read becomes eligible under today's `serialEligible`; it is due for a
 * rewrite only when its serial differs from the indexer's (`serialDue`). Only online,
 * non-pre-assigned collections are touched, so no operator exclusion is undone: an online read
 * could never be excluded, since it was never eligible.
 *
 * Dry run by default, which needs read-only connections:
 *   PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env src/script/cosmo-objekt-rejudge-online.ts
 * APPLY=1 writes the app database (an owner-approved production write):
 *   APPLY=1 bun run --env-file=../../.env src/script/cosmo-objekt-rejudge-online.ts
 */
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { cosmoObjekt } from "@repo/db/schema";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";

import { serialDue, serialEligible } from "@/lib/cosmo-objekts";
import { preAssignedCollections } from "@/lib/serial-constants";

const APPLY = process.env.APPLY === "1";
const PAGE = 2000;

function fail(message: string): never {
  console.error(`[cosmo-objekt-rejudge-online] refused: ${message}`);
  process.exit(1);
}

if (!APPLY) {
  for (const [name, client] of [
    ["app", db],
    ["indexer", indexer],
  ] as const) {
    const { rows } = await client.execute<{ default_transaction_read_only: string }>(
      sql`show default_transaction_read_only`,
    );
    if (rows[0]?.default_transaction_read_only !== "on") {
      fail(
        `a dry run needs a read-only ${name} connection: pass PGOPTIONS='-c default_transaction_read_only=on'`,
      );
    }
  }
}
console.log(
  `[cosmo-objekt-rejudge-online] ${APPLY ? "APPLY: writes the app database" : "dry run"}`,
);

type Change = { tokenId: string; observedAt: string; due: boolean };
const bySlug = new Map<string, { eligible: number; due: number }>();
const changes: Change[] = [];
let after = "";
while (true) {
  const page = await db
    .select({
      tokenId: cosmoObjekt.tokenId,
      slug: cosmoObjekt.slug,
      objektNo: cosmoObjekt.objektNo,
      observedAt: cosmoObjekt.observedAt,
      receivedAt: cosmoObjekt.receivedAt,
    })
    .from(cosmoObjekt)
    .where(and(sql`${cosmoObjekt.serialEligible} = false`, gt(cosmoObjekt.tokenId, after)))
    .orderBy(asc(cosmoObjekt.tokenId))
    .limit(PAGE);
  if (page.length === 0) break;
  after = page.at(-1)!.tokenId;

  const found = await indexer
    .select({
      id: objekts.id,
      mintedAt: objekts.mintedAt,
      receivedAt: objekts.receivedAt,
      serial: objekts.serial,
      slug: collections.slug,
      onOffline: collections.onOffline,
    })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(
      inArray(
        objekts.id,
        page.map((r) => r.tokenId),
      ),
    );
  const byId = new Map(found.map((o) => [o.id, o] as const));
  for (const read of page) {
    const own = byId.get(read.tokenId);
    if (!own || own.onOffline !== "online" || preAssignedCollections.includes(own.slug)) continue;
    if (serialEligible({ slug: read.slug, receivedAt: read.receivedAt }, own) !== true) continue;
    const due = serialDue(true, read.objektNo, own);
    changes.push({ tokenId: read.tokenId, observedAt: read.observedAt, due });
    const tally = bySlug.get(read.slug) ?? { eligible: 0, due: 0 };
    tally.eligible += 1;
    if (due) tally.due += 1;
    bySlug.set(read.slug, tally);
  }
}

for (const [slug, t] of [...bySlug]
  .filter(([, t]) => t.due > 0)
  .sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`${slug}: ${t.eligible} eligible, ${t.due} due`);
}
const dueCount = changes.filter((c) => c.due).length;
const dueSlugs = [...bySlug.values()].filter((t) => t.due > 0).length;
console.log(
  `${changes.length} read(s) become eligible in ${bySlug.size} collection(s); ${dueCount} due in ${dueSlugs}`,
);

if (APPLY && changes.length > 0) {
  let written = 0;
  for (let i = 0; i < changes.length; i += PAGE) {
    const part = changes.slice(i, i + PAGE);
    // only rows still judged false at the read we judged: a newer read was judged at record time
    const { rows } = await db.execute<{ token_id: string }>(sql`
      UPDATE ${cosmoObjekt} SET serial_eligible = true, serial_due = c.due
      FROM unnest(
        ${sql.param(part.map((c) => c.tokenId))}::varchar[],
        ${sql.param(part.map((c) => c.observedAt))}::timestamptz[],
        ${sql.param(part.map((c) => c.due))}::boolean[]
      ) AS c(id, observed_at, due)
      WHERE ${cosmoObjekt.tokenId} = c.id AND ${cosmoObjekt.observedAt} = c.observed_at
        AND ${cosmoObjekt.serialEligible} = false
      RETURNING ${cosmoObjekt.tokenId}
    `);
    written += rows.length;
  }
  console.log(`${written} row(s) written`);
}
process.exit(0);
