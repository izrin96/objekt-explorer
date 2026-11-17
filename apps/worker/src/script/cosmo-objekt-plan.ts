/**
 * The plan for the per-objekt data connected accounts returned (`cosmo_objekt`): what the serial
 * job and the transferable step would do if every `COSMO_OBJEKT_WRITES` word were on. Run it
 * before turning a word on. It writes nothing.
 *
 * Serials: per collection, the serials `mergeAnchors` of the manual anchors and the confirmed
 * serials would move (count and range, from `shiftedSerials`), the conflicts and refusals, and
 * the online and v1 serials Cosmo and the indexer disagree on (compared only, never written).
 *
 * Transferable: `judgeTransferable` with both directions on, over every row whatever its due
 * flags: outcomes, the writes by direction, non-transferable reason and class (and the
 * untransferable reads left as reports because their reason is not trusted), what the breaker
 * would do with those writes, the distinct reasons, sample token ids, and the
 * `cosmo_transferable` records split by whether a newer
 * `transferability_update` exists (the ones `fix-transferability` would supersede, and the rest,
 * which it holds wherever the chain disagrees; this script makes no chain reads).
 *
 * It refuses to start unless the indexer connection is read-only, and reads the app database in
 * a read-only transaction.
 *
 *   PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env src/script/cosmo-objekt-plan.ts
 *   SLUG=<slug> PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env src/script/cosmo-objekt-plan.ts
 *
 * SLUG narrows the serial part to one collection.
 */
import { type Tx, db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { cosmoObjekt, cosmoTransferable } from "@repo/db/schema";
import { and, asc, count, eq, gt, inArray, sql } from "drizzle-orm";

import { mergeAnchors } from "@/lib/cosmo-anchors";
import {
  BREAKER_CAP,
  BREAKER_FLOOR,
  BREAKER_SHARE,
  type TransferableObjekt,
  judgeTransferable,
  outcomeCounts,
  transferableBreaker,
} from "@/lib/cosmo-transferable";
import {
  V1_CUTOFF_MS,
  computeOfflineSerialUpdates,
  computeOfflineSerials,
  shiftedSerials,
} from "@/lib/serial-math";

const SLUG = process.env.SLUG;
const PAGE = 5000;
const CHUNK = 500;
const SAMPLE = 10;
function* chunk<T>(items: T[], size: number) {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

const MODE = { untransferable: true, transferable: true };

function fail(message: string): never {
  console.error(`[cosmo-objekt-plan] refused: ${message}`);
  process.exit(1);
}

const { rows: readOnly } = await indexer.execute<{ default_transaction_read_only: string }>(
  sql`show default_transaction_read_only`,
);
if (readOnly[0]?.default_transaction_read_only !== "on") {
  fail(
    "needs a read-only indexer connection: pass PGOPTIONS='-c default_transaction_read_only=on'",
  );
}

const observedMs = sql<string>`floor(extract(epoch from ${cosmoObjekt.observedAt}) * 1000)::bigint`;

function heading(title: string) {
  console.log(`\n== ${title}`);
}

// Serials ---------------------------------------------------------------------------------------

const SPREAD_BUCKETS = ["0", "1-10", "11-100", "101-1000", "over 1000"] as const;
function spreadBucket(distance: number) {
  if (distance === 0) return "0";
  if (distance <= 10) return "1-10";
  if (distance <= 100) return "11-100";
  if (distance <= 1000) return "101-1000";
  return "over 1000";
}

async function serialPlan(app: Tx) {
  heading(`Confirmed serials${SLUG ? ` (${SLUG})` : ""}`);
  const bySlug = await app
    .select({
      slug: cosmoObjekt.slug,
      confirmed: count(sql`1`).mapWith(Number),
    })
    .from(cosmoObjekt)
    .where(and(sql`${cosmoObjekt.serialEligible}`, SLUG ? eq(cosmoObjekt.slug, SLUG) : undefined))
    .groupBy(cosmoObjekt.slug)
    .orderBy(asc(cosmoObjekt.slug));
  const [states] = await app
    .select({
      eligible: sql<number>`count(*) filter (where ${cosmoObjekt.serialEligible})`.mapWith(Number),
      notEligible:
        sql<number>`count(*) filter (where ${cosmoObjekt.serialEligible} = false)`.mapWith(Number),
      unjudged: sql<number>`count(*) filter (where ${cosmoObjekt.serialEligible} is null)`.mapWith(
        Number,
      ),
    })
    .from(cosmoObjekt)
    .where(SLUG ? eq(cosmoObjekt.slug, SLUG) : undefined);
  console.log(
    `${states!.eligible} confirmed, ${states!.notEligible} not eligible, ${states!.unjudged} not judged yet; ${bySlug.length} collection(s) with confirmed serials`,
  );

  let moved = 0;
  let quiet = 0;
  // how far each confirmed serial sits from the serial the manual anchors alone give
  const spread = new Map<string, number>();
  for (const { slug, confirmed: confirmedCount } of bySlug) {
    const [collection] = await indexer
      .select({
        id: collections.id,
        batches: collections.serialBatches,
        anchors: collections.serialAnchors,
      })
      .from(collections)
      .where(eq(collections.slug, slug))
      .limit(1);
    if (!collection?.batches) {
      console.log(
        `\n${slug}: ${confirmedCount} confirmed, no collection or stored batches: skipped`,
      );
      continue;
    }
    const rows = await indexer
      .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
      .from(objekts)
      .where(eq(objekts.collectionId, collection.id))
      .orderBy(asc(objekts.id));
    const confirmed = await app
      .select({
        tokenId: cosmoObjekt.tokenId,
        objektNo: cosmoObjekt.objektNo,
        observedAt: cosmoObjekt.observedAt,
      })
      .from(cosmoObjekt)
      .where(and(sql`${cosmoObjekt.serialEligible}`, eq(cosmoObjekt.slug, slug)));

    const manual = collection.anchors ?? [];
    const merge = mergeAnchors({ manual, confirmed, rows, batches: collection.batches });

    // what only the confirmed serials change: the rewrite also writes whatever the manual
    // anchors alone would, which is not this change's doing
    const without = new Map(
      computeOfflineSerials(rows, collection.batches, V1_CUTOFF_MS, manual).map(
        (c) => [c.id, c.serial] as const,
      ),
    );
    const updates = computeOfflineSerialUpdates(rows, collection.batches, merge.anchors).filter(
      (u) => without.get(u.id) !== u.newSerial,
    );
    const shift = shiftedSerials(rows, updates);
    moved += updates.length;
    for (const c of confirmed) {
      const estimated = without.get(c.tokenId);
      if (estimated === undefined) continue;
      const bucket = spreadBucket(Math.abs(c.objektNo - estimated));
      spread.set(bucket, (spread.get(bucket) ?? 0) + 1);
    }

    if (updates.length === 0 && merge.conflicts.length === 0 && merge.refused.length === 0) {
      quiet += 1;
      continue;
    }
    const kept = merge.anchors.length - manual.length;
    console.log(
      `\n${slug}: ${confirmedCount} confirmed, ${kept} kept as anchors, ${merge.conflicts.length} conflict(s), ${merge.refused.length} refused`,
    );
    if (updates.length > 0) {
      console.log(
        `  would move ${updates.length} serial(s)` +
          (shift
            ? `; ${shift.count} already shown, by ${shift.min}..${shift.max}`
            : "; none already shown"),
      );
      const serialOf = new Map(rows.map((o) => [o.id, o.serial] as const));
      for (const u of updates.slice(0, SAMPLE)) {
        console.log(`    ${u.id}: ${serialOf.get(u.id)} -> ${u.newSerial}`);
      }
      if (updates.length > SAMPLE) console.log(`    (+${updates.length - SAMPLE} more)`);
    }
    for (const c of merge.conflicts) {
      console.log(
        c.pinnedSerial === null
          ? `  conflict: token ${c.tokenId} Cosmo ${c.objektNo}, disagrees with another confirmed serial of its batch`
          : `  conflict: token ${c.tokenId} Cosmo ${c.objektNo}, pinned ${c.pinnedSerial}`,
      );
    }
    for (const r of merge.refused) {
      console.log(`  refused: token ${r.tokenId} Cosmo ${r.objektNo}: ${r.reason}`);
    }
  }
  console.log(
    `\n${moved} serial(s) would move in total; ${quiet} collection(s) with nothing to report`,
  );
  console.log("Distance of confirmed serials from the estimate:");
  for (const bucket of SPREAD_BUCKETS)
    console.log(`  ${bucket.padEnd(10)} ${spread.get(bucket) ?? 0}`);

  await serialDifferences(app);
}

/** Online and v1 serials Cosmo and the indexer disagree on. Compared only. */
async function serialDifferences(app: Tx) {
  heading("Cosmo serials of tokens the serial job never anchors on (compared only)");
  type Tally = { checked: number; differ: number; samples: string[] };
  const tallies = new Map<string, Tally>();
  let after = "";
  while (true) {
    const page = await app
      .select({
        tokenId: cosmoObjekt.tokenId,
        slug: cosmoObjekt.slug,
        objektNo: cosmoObjekt.objektNo,
      })
      .from(cosmoObjekt)
      .where(
        and(
          sql`${cosmoObjekt.serialEligible} = false`,
          gt(cosmoObjekt.tokenId, after),
          SLUG ? eq(cosmoObjekt.slug, SLUG) : undefined,
        ),
      )
      .orderBy(asc(cosmoObjekt.tokenId))
      .limit(PAGE);
    if (page.length === 0) break;
    after = page.at(-1)!.tokenId;
    for (const part of chunk(page, CHUNK)) {
      const found = await indexer
        .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
        .from(objekts)
        .where(
          inArray(
            objekts.id,
            part.map((r) => r.tokenId),
          ),
        );
      const byId = new Map(found.map((o) => [o.id, o] as const));
      for (const read of part) {
        const own = byId.get(read.tokenId);
        if (!own || own.serial === 0) continue;
        const kind = Date.parse(own.mintedAt) < V1_CUTOFF_MS ? "v1" : "post-cutoff";
        const key = `${read.slug} (${kind})`;
        const tally = tallies.get(key) ?? { checked: 0, differ: 0, samples: [] };
        tally.checked += 1;
        if (own.serial !== read.objektNo) {
          tally.differ += 1;
          if (tally.samples.length < 3) {
            tally.samples.push(`${read.tokenId}: Cosmo ${read.objektNo}, indexer ${own.serial}`);
          }
        }
        tallies.set(key, tally);
      }
    }
  }
  let any = false;
  for (const [key, t] of [...tallies].sort(([a], [b]) => a.localeCompare(b))) {
    if (t.differ === 0) continue;
    any = true;
    console.log(`${key}: ${t.differ} of ${t.checked} differ; ${t.samples.join("; ")}`);
  }
  const checked = [...tallies.values()].reduce((n, t) => n + t.checked, 0);
  const differ = [...tallies.values()].reduce((n, t) => n + t.differ, 0);
  console.log(`${differ} of ${checked} compared serial(s) differ${any ? "" : " (none to list)"}`);
}

// Transferable ----------------------------------------------------------------------------------

type JudgeRow = {
  id: string;
  transferable: boolean;
  owner: string;
  received_at: Date;
  slug: string;
  class: string;
  newer_change: boolean;
};

async function transferablePlan(app: Tx) {
  heading("Transferable, both directions on");
  const outcomes: string[] = [];
  const writes = new Map<string, number>();
  const untrusted = new Map<string, number>();
  const samples: Record<string, string[]> = { untransferable: [], transferable: [] };
  let after = "";
  let total = 0;
  while (true) {
    const page = await app
      .select({
        tokenId: cosmoObjekt.tokenId,
        slug: cosmoObjekt.slug,
        transferable: cosmoObjekt.transferable,
        reason: cosmoObjekt.nonTransferableReason,
        chainHeight: cosmoObjekt.chainHeight,
        observedMs,
        receivedAt: sql<string | null>`to_json(${cosmoObjekt.receivedAt}) #>> '{}'`,
      })
      .from(cosmoObjekt)
      .where(gt(cosmoObjekt.tokenId, after))
      .orderBy(asc(cosmoObjekt.tokenId))
      .limit(PAGE);
    if (page.length === 0) break;
    after = page.at(-1)!.tokenId;
    total += page.length;
    for (const part of chunk(page, CHUNK)) {
      const { rows } = await indexer.$client.query<JudgeRow>(
        `select o.id, o.transferable, o.owner, o.received_at, c.slug, c.class,
                exists (select 1 from transferability_update u
                        where u.token_id = o.id and (u.block_number > r.height or u.applied_at is null))
                  as newer_change
         from unnest($1::text[], $2::int[]) as r(id, height)
         join objekt o on o.id = r.id
         join collection c on c.id = o.collection_id`,
        [part.map((r) => r.tokenId), part.map((r) => r.chainHeight)],
      );
      const byId = new Map(rows.map((o) => [o.id, o] as const));
      for (const read of part) {
        const found = byId.get(read.tokenId);
        const objekt: TransferableObjekt = found
          ? {
              transferable: found.transferable,
              owner: found.owner,
              receivedAt: found.received_at,
              slug: found.slug,
              newerChange: found.newer_change,
            }
          : null;
        const outcome = judgeTransferable(
          objekt,
          {
            tokenId: read.tokenId,
            slug: read.slug,
            transferable: read.transferable,
            nonTransferableReason: read.reason,
            observedAt: new Date(Number(read.observedMs)),
            receivedAt: read.receivedAt,
            chainHeight: read.chainHeight,
          },
          MODE,
        );
        outcomes.push(outcome);
        if (outcome.startsWith("write_")) {
          const direction = outcome.slice("write_".length);
          const key = `${direction} | ${read.reason ?? "no reason"} | ${found?.class ?? "?"}`;
          writes.set(key, (writes.get(key) ?? 0) + 1);
          const sample = samples[direction]!;
          if (sample.length < SAMPLE) sample.push(read.tokenId);
        } else if (outcome === "report_untransferable") {
          // with both directions on, only an untrusted reason leaves an untransferable read a report
          const key = `${read.reason ?? "no reason"} | ${found?.class ?? "?"}`;
          untrusted.set(key, (untrusted.get(key) ?? 0) + 1);
        }
      }
    }
  }

  console.log(`${total} row(s) judged`);
  for (const [outcome, n] of Object.entries(outcomeCounts(outcomes)).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.log(`  ${outcome.padEnd(22)} ${n}`);
  }
  console.log("\nWrites by direction | non-transferable reason | class");
  for (const [key, n] of [...writes].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${key}: ${n}`);
  }
  if (writes.size === 0) console.log("  none");
  for (const [direction, ids] of Object.entries(samples)) {
    console.log(`sample ${direction}: ${ids.join(", ") || "none"}`);
  }
  console.log("\nUntransferable reads not written, reason not trusted | class");
  for (const [key, n] of [...untrusted].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${key}: ${n}`);
  }
  if (untrusted.size === 0) console.log("  none");

  heading("Breaker");
  const planned = [...writes.values()].reduce((n, w) => n + w, 0);
  const breaker = transferableBreaker(planned, total);
  console.log(
    `${planned} write(s) planned over ${total} read(s); a run writes at most ${BREAKER_CAP}, or ${BREAKER_SHARE * 100}% of its reads with a floor of ${BREAKER_FLOOR} (here ${breaker.limit})`,
  );
  console.log(
    breaker.tripped
      ? "  if these were one run's reads, it would trip: nothing written, the planned reads left due"
      : "  if these were one run's reads, it would write them",
  );

  heading("Non-transferable reasons Cosmo reported");
  const reasons = await app
    .select({
      reason: cosmoObjekt.nonTransferableReason,
      n: count(sql`1`).mapWith(Number),
    })
    .from(cosmoObjekt)
    .groupBy(cosmoObjekt.nonTransferableReason)
    .orderBy(sql`2 desc`);
  for (const r of reasons) console.log(`  ${(r.reason ?? "(none)").padEnd(28)} ${r.n}`);

  await recordSplit(app);
}

async function recordSplit(app: Tx) {
  heading("cosmo_transferable records");
  let after = "";
  const tally = { total: 0, superseded: 0, wouldSupersede: 0, held: 0 };
  while (true) {
    const page = await app
      .select({
        tokenId: cosmoTransferable.tokenId,
        chainHeight: cosmoTransferable.chainHeight,
        supersededAt: cosmoTransferable.supersededAt,
      })
      .from(cosmoTransferable)
      .where(gt(cosmoTransferable.tokenId, after))
      .orderBy(asc(cosmoTransferable.tokenId))
      .limit(PAGE);
    if (page.length === 0) break;
    after = page.at(-1)!.tokenId;
    for (const part of chunk(page, CHUNK)) {
      const { rows } = await indexer.$client.query<{ token_id: string; newest: number }>(
        `select token_id, max(block_number) as newest from transferability_update
         where token_id = any($1::text[]) group by token_id`,
        [part.map((r) => r.tokenId)],
      );
      const newest = new Map(rows.map((r) => [r.token_id, r.newest] as const));
      for (const record of part) {
        tally.total += 1;
        if (record.supersededAt) tally.superseded += 1;
        else if ((newest.get(record.tokenId) ?? 0) > record.chainHeight) tally.wouldSupersede += 1;
        else tally.held += 1;
      }
    }
  }
  console.log(`${tally.total} record(s)`);
  console.log(`  already superseded                                  ${tally.superseded}`);
  console.log(`  newer chain change above their height (superseded)  ${tally.wouldSupersede}`);
  console.log(`  none above their height (held wherever chain differs) ${tally.held}`);
}

console.log(
  `[cosmo-objekt-plan] read-only; nothing is written${SLUG ? `; serials for ${SLUG}` : ""}`,
);
await db.transaction(
  async (app) => {
    await serialPlan(app);
    await transferablePlan(app);
  },
  { accessMode: "read only", isolationLevel: "repeatable read" },
);
console.log("\n[cosmo-objekt-plan] done; nothing written");
process.exit(0);
