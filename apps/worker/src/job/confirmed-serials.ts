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
import { heartbeat, log, type Logger } from "@/lib/log";
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
const DUE_WINDOW_MS = 30 * DAY_MS;
const RECHECK_MS = 6 * 60 * 60 * 1000;

/** Whether this process's `COSMO_OBJEKT_WRITES` lets confirmed serials anchor. */
function confirmedAnchorsOn() {
  return objektWriteModes(process.env.COSMO_OBJEKT_WRITES).anchors;
}

/** Whether this process's `COSMO_OBJEKT_WRITES` lets confirmed serials anchor online collections. */
export function onlineAnchorsOn() {
  return objektWriteModes(process.env.COSMO_OBJEKT_WRITES).onlineAnchors;
}

/**
 * The confirmed serials of offline (and pre-assigned) `slugs`, by slug; empty, with no query,
 * unless `anchors` is on. Online collections read theirs through `loadOnlineConfirmedSerials`.
 */
export async function loadConfirmedSerials(slugs: string[]) {
  if (!confirmedAnchorsOn()) return new Map<string, ConfirmedSerial[]>();
  return readConfirmedSerials(slugs);
}

/** One online collection's confirmed serials; empty, with no query, unless `online-anchors` is on. */
export async function loadOnlineConfirmedSerials(slug: string) {
  if (!onlineAnchorsOn()) return [];
  return (await readConfirmedSerials([slug])).get(slug) ?? [];
}

async function readConfirmedSerials(slugs: string[]) {
  const bySlug = new Map<string, ConfirmedSerial[]>();
  if (slugs.length === 0) return bySlug;
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

export type DueRow = {
  tokenId: string;
  slug: string;
  observedAt: string;
  receivedAt: string | null;
  serialEligible: boolean | null;
};

export type SlugOutcome = {
  // serials written, or null when the collection was not rewritten
  written: number | null;
  // rows done with: judged not eligible, or eligible and in the rewritten collection
  settled: Set<string>;
};

export type SerialKind = "offline" | "online";

const DUE_SLUGS: Record<SerialKind, number> = { offline: 20, online: 100 };

function dueRowWhere(now: number) {
  return and(
    // the bare column matches cosmo_objekt_serial_due_idx's predicate
    sql`${cosmoObjekt.serialDue}`,
    sql`${cosmoObjekt.serialEligible} is not false`,
    gte(cosmoObjekt.observedAt, new Date(now - DUE_WINDOW_MS).toISOString()),
    or(
      isNull(cosmoObjekt.serialCheckedAt),
      lt(cosmoObjekt.serialCheckedAt, new Date(now - RECHECK_MS).toISOString()),
    ),
  );
}

/**
 * The due slugs of one kind, oldest read first. Only reads that would move a serial are due, so
 * the pool is small and read whole: a window over both kinds would let one kind's backlog starve
 * the other. A slug the indexer lacks goes to the offline step, which settles it.
 */
async function dueSlugsOf(kind: SerialKind, now: number) {
  const due = await db
    .select({ slug: cosmoObjekt.slug })
    .from(cosmoObjekt)
    .where(dueRowWhere(now))
    .groupBy(cosmoObjekt.slug)
    .orderBy(sql`min(${cosmoObjekt.observedAt})`);
  if (due.length === 0) return [];
  const known = await indexer
    .select({ slug: collections.slug, onOffline: collections.onOffline })
    .from(collections)
    .where(
      inArray(
        collections.slug,
        due.map((d) => d.slug),
      ),
    );
  const online = new Set(
    known
      .filter((c) => c.onOffline === "online" && !preAssignedCollections.includes(c.slug))
      .map((c) => c.slug),
  );
  return due
    .map((d) => d.slug)
    .filter((slug) => online.has(slug) === (kind === "online"))
    .slice(0, DUE_SLUGS[kind]);
}

/**
 * The last step of `populateSerialOffline`: rewrite the collections with new confirmed serials,
 * since populate itself only revisits a collection holding a serial 0. Never writes
 * `collection.serial_anchors`. `tally` is the run's, reported by the caller; without one the
 * step reports its own.
 */
export async function applyConfirmedSerials(tally?: MergeTally) {
  if (!confirmedAnchorsOn()) return;
  const runTally = tally ?? mergeTally();
  await applyDue("offline", (slug, rows) => confirmSlug(slug, rows, runTally), {
    log: offlineLog,
    beat: offlineBeat,
  });
  if (!tally) reportMerges(runTally);
}

/**
 * Rewrite every due collection of one kind through `confirm`, then store the check on its rows.
 * A lock timeout leaves the slug unchecked for the next run; any other failure stamps it so it
 * waits out RECHECK_MS instead of taking a slot every run.
 */
export async function applyDue(
  kind: SerialKind,
  confirm: (slug: string, rows: DueRow[]) => Promise<SlugOutcome>,
  report: { log: Logger; beat: ReturnType<typeof heartbeat> },
) {
  const now = Date.now();
  const slugs = await dueSlugsOf(kind, now);
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
    .where(and(dueRowWhere(now), inArray(cosmoObjekt.slug, slugs)));

  let rewritten = 0;
  let moved = 0;
  let lockTimeouts = 0;
  let failed = 0;
  for (const slug of slugs) {
    const rows = due.filter((r) => r.slug === slug);
    try {
      const outcome = await confirm(slug, rows);
      await markChecked(rows, outcome.settled);
      if ((outcome.written ?? 0) > 0) rewritten++;
      moved += outcome.written ?? 0;
    } catch (error) {
      // 55P03 or 40P01: an indexer batch held the rows; left unchecked, the next run retries it
      if (findPgError(error, (e) => e.code === "55P03" || e.code === "40P01")) lockTimeouts++;
      else {
        failed++;
        report.log.debug(`${slug}: confirmed serials failed: ${errorCode(error)}`);
        try {
          await markChecked(rows, new Set());
        } catch (stampError) {
          report.log.debug(`${slug}: check not stamped: ${errorCode(stampError)}`);
        }
      }
    }
  }

  report.beat.count("confirmed slugs checked", slugs.length);
  if (moved > 0) {
    report.log.info(
      `confirmed serials: rewrote ${rewritten} collection(s), ${moved} serial(s) moved`,
    );
  }
  if (lockTimeouts > 0 || failed > 0) {
    report.log.warn(
      `confirmed serials: ${lockTimeouts} collection(s) waited on an indexer lock, ${failed} failed; they retry next run`,
    );
  }
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

  // a row whose token is not among the rows yet (minted within the delay) waits for a later run,
  // and a refused one stays due, so the site never reads its batch as exact; it is retried
  // after RECHECK_MS
  const present = new Set(objektRows.map((o) => o.id));
  const refused = new Set(merge.refused.map((r) => String(r.tokenId)));
  for (const [tokenId, value] of eligible) {
    if (value === true && present.has(tokenId) && !refused.has(tokenId)) settled.add(tokenId);
  }
  return { written, settled };
}

/**
 * Judge the rows recorded before the indexer had their token, storing the judgements first. Such
 * a row has no recorded `received_at`, so the chain never confirmed its holder: it can be judged
 * false (another slug, online, a v1 mint) but never true; a later read settles it.
 */
export async function judgeUnjudged(
  slug: string,
  rows: DueRow[],
  eligible: Map<string, boolean | null>,
) {
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
    // never true from here: only a read the chain confirmed when it was recorded can pin a serial
    if (value !== false) continue;
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
