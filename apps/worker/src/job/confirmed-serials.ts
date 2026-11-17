// Confirmed serials (design Decision 5): the `cosmo_objekt` reads that anchor their batch beside
// the manual `collection.serial_anchors`, and the populate step that rewrites a collection when a
// new one arrives. Every serial path loads them here; with `anchors` off in this process's
// `COSMO_OBJEKT_WRITES` nothing is read and every path keeps its manual anchors as they are.

import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { cosmoObjekt } from "@repo/db/schema";
import { objektWriteModes } from "@repo/lib/cosmo-objekt-writes";
import { findPgError } from "@repo/lib/pg-error";
import { and, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";

import { rewriteSerials } from "@/job/serial-batches";
import type { ConfirmedSerial } from "@/lib/cosmo-anchors";
import { serialEligible } from "@/lib/cosmo-objekts";
import { errorCode } from "@/lib/error-code";
import { heartbeat, log } from "@/lib/log";
import {
  type MergeTally,
  mergeTally,
  tallyDetails,
  tallyWarning,
  withConfirmed,
} from "@/lib/merge-tally";
import { MINT_DELAY_MS, preAssignedCollections } from "@/lib/serial-constants";
import { computeOfflineSerialUpdates } from "@/lib/serial-math";

export const offlineLog = log("serial-offline");
export const offlineBeat = heartbeat(offlineLog);

const DAY_MS = 24 * 60 * 60 * 1000;
const DUE_SLUGS = 20;
const DUE_WINDOW_MS = 30 * DAY_MS;
const RECHECK_MS = 6 * 60 * 60 * 1000;

/** Whether this process's `COSMO_OBJEKT_WRITES` lets confirmed serials anchor. */
export function confirmedAnchorsOn() {
  return objektWriteModes(process.env.COSMO_OBJEKT_WRITES).anchors;
}

/** The confirmed serials of `slugs`, by slug; empty, with no query, unless `anchors` is on. */
export async function loadConfirmedSerials(slugs: string[]) {
  const bySlug = new Map<string, ConfirmedSerial[]>();
  if (!confirmedAnchorsOn() || slugs.length === 0) return bySlug;
  const rows = await db
    .select({
      slug: cosmoObjekt.slug,
      tokenId: cosmoObjekt.tokenId,
      objektNo: cosmoObjekt.objektNo,
      observedAt: cosmoObjekt.observedAt,
    })
    .from(cosmoObjekt)
    // the bare column matches cosmo_objekt_confirmed_idx's predicate
    .where(
      and(
        sql`${cosmoObjekt.slug} = any(${sql.param([...new Set(slugs)])}::text[])`,
        sql`${cosmoObjekt.serialEligible}`,
      ),
    );
  for (const { slug, ...read } of rows) {
    const list = bySlug.get(slug);
    if (list) list.push(read);
    else bySlug.set(slug, [read]);
  }
  return bySlug;
}

/** One `warn` for a run's conflicts and refusals, per-token lines at `debug`, counts to the heartbeat. */
export function reportMerges(tally: MergeTally) {
  const line = tallyWarning(tally);
  if (!line) return;
  offlineLog.warn(line);
  for (const detail of tallyDetails(tally)) offlineLog.debug(detail);
  const conflicts = tally.conflicts().length;
  const refused = tally.refused().length;
  if (conflicts > 0) offlineBeat.count("confirmed conflicts", conflicts);
  if (refused > 0) offlineBeat.count("confirmed refused", refused);
}

type DueRow = {
  tokenId: string;
  slug: string;
  observedAt: string;
  receivedAt: string | null;
  serialEligible: boolean | null;
};

type SlugOutcome = {
  // serials written, or null when the collection was not rewritten
  written: number | null;
  // rows done with: judged not eligible, or eligible and in the rewritten collection
  settled: Set<string>;
};

/**
 * The last step of `populateSerialOffline`: rewrite the collections with new confirmed serials,
 * since populate itself only revisits a collection holding a serial 0. Never writes
 * `collection.serial_anchors`. `tally` is the run's, reported by the caller; without one the
 * step reports its own.
 */
export async function applyConfirmedSerials(tally?: MergeTally) {
  if (!confirmedAnchorsOn()) return;
  const runTally = tally ?? mergeTally();

  const now = Date.now();
  const dueRow = and(
    // the bare column matches cosmo_objekt_serial_due_idx's predicate
    sql`${cosmoObjekt.serialDue}`,
    sql`${cosmoObjekt.serialEligible} is not false`,
    gte(cosmoObjekt.observedAt, new Date(now - DUE_WINDOW_MS).toISOString()),
    or(
      isNull(cosmoObjekt.serialCheckedAt),
      lt(cosmoObjekt.serialCheckedAt, new Date(now - RECHECK_MS).toISOString()),
    ),
  );
  const slugs = (
    await db
      .select({ slug: cosmoObjekt.slug })
      .from(cosmoObjekt)
      .where(dueRow)
      .groupBy(cosmoObjekt.slug)
      .orderBy(sql`min(${cosmoObjekt.observedAt})`)
      .limit(DUE_SLUGS)
  ).map((r) => r.slug);
  if (slugs.length === 0) return;

  const due: DueRow[] = await db
    .select({
      tokenId: cosmoObjekt.tokenId,
      slug: cosmoObjekt.slug,
      observedAt: cosmoObjekt.observedAt,
      receivedAt: cosmoObjekt.receivedAt,
      serialEligible: cosmoObjekt.serialEligible,
    })
    .from(cosmoObjekt)
    .where(and(dueRow, inArray(cosmoObjekt.slug, slugs)));

  let rewritten = 0;
  let moved = 0;
  let lockTimeouts = 0;
  let failed = 0;
  for (const slug of slugs) {
    const rows = due.filter((r) => r.slug === slug);
    try {
      const outcome = await confirmSlug(slug, rows, runTally);
      await markChecked(rows, outcome.settled);
      if ((outcome.written ?? 0) > 0) rewritten++;
      moved += outcome.written ?? 0;
    } catch (error) {
      // 55P03 or 40P01: an indexer batch held the rows; left unchecked, the next run retries it
      if (findPgError(error, (e) => e.code === "55P03" || e.code === "40P01")) lockTimeouts++;
      else {
        failed++;
        offlineLog.debug(`${slug}: confirmed serials failed: ${errorCode(error)}`);
        // stamped but not settled, so the slug waits out RECHECK_MS instead of taking a slot
        // every run
        try {
          await markChecked(rows, new Set());
        } catch (stampError) {
          offlineLog.debug(`${slug}: check not stamped: ${errorCode(stampError)}`);
        }
      }
    }
  }

  offlineBeat.count("confirmed slugs checked", slugs.length);
  if (moved > 0) {
    offlineLog.info(
      `confirmed serials: rewrote ${rewritten} collection(s), ${moved} serial(s) moved`,
    );
  }
  if (lockTimeouts > 0 || failed > 0) {
    offlineLog.warn(
      `confirmed serials: ${lockTimeouts} collection(s) waited on an indexer lock, ${failed} failed; they retry next run`,
    );
  }
  if (!tally) reportMerges(runTally);
}

/** Judge, merge and rewrite one collection with its confirmed serials. */
async function confirmSlug(slug: string, rows: DueRow[], tally: MergeTally): Promise<SlugOutcome> {
  const eligible = new Map(rows.map((r) => [r.tokenId, r.serialEligible] as const));
  await judgeUnjudged(slug, rows, eligible);

  const settled = new Set<string>();
  for (const [tokenId, value] of eligible) if (value === false) settled.add(tokenId);
  const skip = (why: string) => {
    offlineLog.debug(`${slug}: confirmed serials not applied (${why})`);
    return { written: null, settled };
  };

  const [collection] = await indexer
    .select({
      id: collections.id,
      onOffline: collections.onOffline,
      slug: collections.slug,
      batches: collections.serialBatches,
      anchors: collections.serialAnchors,
    })
    .from(collections)
    .where(eq(collections.slug, slug))
    .limit(1);
  if (!collection) return skip("no such collection");
  if (collection.onOffline !== "offline" && !preAssignedCollections.includes(slug)) {
    return skip("online collection");
  }
  const batches = collection.batches ?? [];
  // populate stores the ranges first, and its rewrite then anchors on these reads
  if (batches.length === 0) return skip("no stored batches");

  const objektRows = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, collection.id),
        lte(objekts.mintedAt, new Date(Date.now() - MINT_DELAY_MS).toISOString()),
      ),
    );

  const confirmed = (await loadConfirmedSerials([slug])).get(slug);
  const merge = withConfirmed(collection.anchors ?? [], confirmed, objektRows, batches);
  tally.record(collection.id, merge);

  const updates = computeOfflineSerialUpdates(objektRows, batches, merge.anchors);
  let written = 0;
  if (updates.length > 0) {
    const serialOf = new Map(objektRows.map((o) => [o.id, o.serial] as const));
    const deltas = updates.map((u) => u.newSerial - serialOf.get(u.id)!);
    offlineLog.debug(
      `${slug}: confirmed serials move ${updates.length} serial(s) by ${Math.min(...deltas)}..${Math.max(...deltas)}`,
    );
    written = await indexer.transaction(async (tx) => {
      // SET LOCAL, so the timeout ends with the transaction and never leaks through pgbouncer
      await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
      return rewriteSerials(objektRows, batches, merge.anchors, offlineLog, slug, tx);
    });
  }

  // a row whose token is not among the rows yet (minted within the delay) waits for a later run
  const present = new Set(objektRows.map((o) => o.id));
  for (const [tokenId, value] of eligible) {
    if (value === true && present.has(tokenId)) settled.add(tokenId);
  }
  return { written, settled };
}

/**
 * Judge the rows recorded before the indexer had their token, storing the judgements first. Such
 * a row has no recorded `received_at`, so the chain never confirmed its holder: it can be judged
 * false (another slug, online, a v1 mint) but never true; a later read settles it.
 */
async function judgeUnjudged(slug: string, rows: DueRow[], eligible: Map<string, boolean | null>) {
  const unjudged = rows.filter((r) => r.serialEligible === null);
  if (unjudged.length === 0) return;
  const recorded = new Map(unjudged.map((r) => [r.tokenId, r.receivedAt] as const));
  const found = await indexer
    .select({
      id: objekts.id,
      mintedAt: objekts.mintedAt,
      receivedAt: objekts.receivedAt,
      slug: collections.slug,
      onOffline: collections.onOffline,
    })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(inArray(objekts.id, [...recorded.keys()]));
  const judged: { id: string; value: boolean }[] = [];
  for (const { id, ...indexerObjekt } of found) {
    const value = serialEligible({ slug, receivedAt: recorded.get(id) ?? null }, indexerObjekt);
    if (value === null) continue;
    eligible.set(id, value);
    judged.push({ id, value });
  }
  if (judged.length === 0) return;
  // only rows still unjudged: an operator's exclusion or a newer read's judgement stands
  await db.execute(sql`
    UPDATE ${cosmoObjekt} SET serial_eligible = j.value
    FROM unnest(
      ${sql.param(judged.map((j) => j.id))}::text[],
      ${sql.param(judged.map((j) => j.value))}::boolean[]
    ) AS j(id, value)
    WHERE ${cosmoObjekt.tokenId} = j.id AND ${cosmoObjekt.serialEligible} IS NULL
  `);
}

/**
 * Store the check on every row read, and take the settled ones off the due list. A row whose
 * read was replaced since (another `observed_at`) is left as the newer read set it.
 */
async function markChecked(rows: DueRow[], settled: Set<string>) {
  if (rows.length === 0) return;
  await db.execute(sql`
    UPDATE ${cosmoObjekt}
    SET serial_checked_at = now(),
      serial_due = CASE WHEN r.settled THEN false ELSE ${cosmoObjekt.serialDue} END
    FROM unnest(
      ${sql.param(rows.map((r) => r.tokenId))}::text[],
      ${sql.param(rows.map((r) => r.observedAt))}::timestamptz[],
      ${sql.param(rows.map((r) => settled.has(r.tokenId)))}::boolean[]
    ) AS r(id, observed_at, settled)
    WHERE ${cosmoObjekt.tokenId} = r.id AND ${cosmoObjekt.observedAt} = r.observed_at
  `);
}
