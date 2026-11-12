/**
 * Boundary drift verifier for un-anchored offline batches.
 *
 * Anchored batches (with a pre-cutoff v1 objekt or a manual anchor) are
 * shielded — their serials come from the anchor regardless of the stored range,
 * so a drifted boundary is harmless. Un-anchored batches (reserved entirely after the v1 cutoff) have
 * no ground truth, so a boundary that was guessed from an unminted (404) token
 * which later minted as *foreign* would silently shift their serials.
 *
 * Each check asks the indexer whether a foreign objekt has minted inside a
 * stored range, and judges the EDGE tokens of each un-anchored batch (the
 * stored start/end plus the first gap token past our own mints) by their
 * indexer owner. On drift it re-runs full discovery for that one collection and
 * rewrites the affected serials.
 *
 * Two scheduled passes, neither probing the Cosmo API: `verifyRecentDrift`
 * every 15 minutes, over only the collections whose ranges hold another
 * collection's mint from the last 24 hours, and `verifyBatchBoundaries` weekly
 * (Sunday 19:08 UTC), over every collection. Probing edge tokens the indexer lacks is
 * manual only (PROBES=recent|all): a dry run on 2026-11-08 made 14,465 calls
 * and found nothing the indexer missed. Manual runs:
 *   DRY_RUN=1 bun run --env-file=../../.env src/job/verify-batch-boundaries.ts
 *   DRY_RUN=1 PROBES=recent bun run --env-file=../../.env src/job/verify-batch-boundaries.ts
 *   RECENT=1 DRY_RUN=1 bun run --env-file=../../.env src/job/verify-batch-boundaries.ts
 */
import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk, slugifyObjekt } from "@repo/lib";
import { and, asc, eq, gt, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { FetchError } from "ofetch";

import {
  discoverBatches,
  dropSpanMemo,
  fitRanges,
  fittedMemberRun,
  isGridDrop,
  type MemberKey,
  rewriteSerials,
  storeRanges,
  tokenIdRange,
} from "@/job/serial-batches";
import { driftCandidates, onlyTriedTokens } from "@/lib/drift-candidates";
import { insideDrop } from "@/lib/drop-grid";
import { heartbeat, log, type Logger } from "@/lib/log";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";
import { discoveryBoundaries, V1_CUTOFF_MS } from "@/lib/serial-math";
import {
  type BatchEdges,
  isRecent,
  judgeEdges,
  PROBE_SCOPES,
  type ProbeScope,
} from "@/lib/verify-plan";

const CONCURRENCY = 5;
const verifyLog = log("verify-batches");

type Batch = { start: number; end: number };
type Probe = "ours" | "foreign" | "unminted";
// owner recorded for a token a probe found foreign; never a collection id
const FOREIGN = "";

async function probe(tokenId: number, targetSlug: string): Promise<Probe> {
  if (tokenId < 1) return "foreign"; // below token 1 == out of our range
  try {
    const raw = await fetchMetadataV3(String(tokenId));
    const metadata = normalizeV3(raw, String(tokenId));
    return slugifyObjekt(metadata.objekt.collectionId) === targetSlug ? "ours" : "foreign";
  } catch (error) {
    if (error instanceof FetchError && error.status === 404) return "unminted";
    throw error;
  }
}

/**
 * The collections a check covers: offline ones (and pre-assigned extras) with
 * stored ranges and a batch no v1 objekt anchors, all of them or only `ids`.
 */
function loadTargets(ids?: string[]) {
  return indexer
    .select({
      id: collections.id,
      slug: collections.slug,
      cid: collections.collectionId,
      season: collections.season,
      collectionNo: collections.collectionNo,
      artist: collections.artist,
      member: collections.member,
      onOffline: collections.onOffline,
      batches: collections.serialBatches,
      anchors: collections.serialAnchors,
    })
    .from(collections)
    .where(
      and(
        or(eq(collections.onOffline, "offline"), inArray(collections.slug, excludeCollections)),
        ids ? inArray(collections.id, ids) : undefined,
        isNotNull(collections.serialBatches),
        // a batch holding a v1 objekt is anchored, so a collection with none left
        // unanchored never needs its objekts loaded; manual anchors are checked below
        sql`exists (
          select 1 from jsonb_array_elements(${collections.serialBatches}) b
          where not exists (
            select 1 from ${objekts} o
            where o.collection_id = ${collections.id} and o.serial > 0
              and o.minted_at < ${new Date(V1_CUTOFF_MS).toISOString()}
              and o.id::bigint between (b->>'start')::bigint and (b->>'end')::bigint))`,
      ),
    );
}

type CheckTarget = Awaited<ReturnType<typeof loadTargets>>[number];

/** Fitted drop and run spans, each fitted once per caller. */
function gridSpans() {
  const dropSpanOf = dropSpanMemo();
  const runSpans = new Map<string, Promise<{ start: number; end: number } | null>>();
  const runSpanOf = (key: MemberKey, collectionId: string) => {
    let span = runSpans.get(collectionId);
    if (!span) {
      span = fittedMemberRun(key, collectionId, undefined, dropSpanOf).then((run) => {
        const value = run ? { start: run.region.start, end: run.grid.end } : null;
        for (const m of run?.members ?? []) runSpans.set(m.id, Promise.resolve(value));
        return value;
      });
      runSpans.set(collectionId, span);
    }
    return span;
  };
  return { dropSpanOf, runSpanOf };
}

type CheckContext = {
  scope: ProbeScope;
  dryRun: boolean;
  spans: ReturnType<typeof gridSpans>;
  logger: Logger;
};

type CheckResult = {
  outcome: "clean" | "drift" | "fixed" | "unchanged" | "failed";
  drifted: boolean;
  gridSkipped: boolean;
  probes: number;
};

/**
 * Check one collection's unanchored batches against the indexer and, when the
 * scope probes it, the Cosmo API; on drift, rediscover and rewrite it unless
 * this is a dry run.
 */
async function checkCollection(t: CheckTarget, ctx: CheckContext): Promise<CheckResult> {
  const result: CheckResult = { outcome: "clean", drifted: false, gridSkipped: false, probes: 0 };
  const { scope, dryRun, logger, spans } = ctx;
  const batches = t.batches ?? [];
  if (batches.length === 0) return result;

  const rows = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(eq(objekts.collectionId, t.id))
    .orderBy(asc(objekts.id));

  if (rows.length === 0) return result;

  const manualAnchors = t.anchors ?? [];
  const isAnchored = (b: Batch) =>
    manualAnchors.some((a) => a.tokenId >= b.start && a.tokenId <= b.end) ||
    rows.some((o) => {
      const tid = parseInt(o.id);
      return (
        o.serial > 0 && Date.parse(o.mintedAt) < V1_CUTOFF_MS && tid >= b.start && tid <= b.end
      );
    });

  // only un-anchored batches are at risk (anchored ones are shielded)
  const atRisk = batches.filter((b) => !isAnchored(b));
  if (atRisk.length === 0) return result;

  // a grid-fitted drop's foreign neighbours already confirm its slot edges, so
  // only the indexer check below covers those batches
  const fittedSpans = isGridDrop(t)
    ? [await spans.dropSpanOf(t), await spans.runSpanOf(t, t.id)].filter((s) => s !== null)
    : [];
  const toProbe = atRisk.filter((b) => !fittedSpans.some((span) => insideDrop(b, span)));
  if (toProbe.length < atRisk.length) {
    result.gridSkipped = true;
    logger.debug(`${t.slug}: ${atRisk.length - toProbe.length} grid batch(es), not probed`);
  }

  const targetSlug = slugifyObjekt(t.cid);
  const tokenIds = rows.map((o) => parseInt(o.id));

  // the frontier (last) batch's end is provisional by design — it grows with
  // every new mint, and the populate job already extends it incrementally.
  // Probing its end would flag normal growth as drift and trigger a full
  // rediscovery for nothing, so only its start side is checked.
  const frontier = batches[batches.length - 1]!;

  const reasons: string[] = [];

  const [foreignInside] = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .where(
      and(or(...atRisk.map((b) => tokenIdRange(b.start, b.end))), ne(objekts.collectionId, t.id)),
    )
    .limit(1);
  if (foreignInside) reasons.push(`foreign token ${foreignInside.id} inside a stored range`);

  // per batch: the stored edges plus the gap tokens next to our own mints. The
  // stored edges can sit in a still-unminted stretch, so the token right next to
  // our mints is the earliest place foreign drift becomes observable.
  const edges: BatchEdges[] = toProbe.map((b) => {
    const isFrontier = b === frontier;
    let firstOurs = Infinity;
    let lastOurs = -Infinity;
    for (const tid of tokenIds) {
      if (tid < b.start || tid > b.end) continue;
      if (tid < firstOurs) firstOurs = tid;
      if (tid > lastOurs) lastOurs = tid;
    }
    return {
      end: isFrontier ? null : b.end,
      endNext: isFrontier ? null : b.end + 1,
      start: b.start,
      startPrev: b.start - 1,
      afterOurs: !isFrontier && lastOurs >= b.start && lastOurs < b.end ? lastOurs + 1 : null,
      beforeOurs: firstOurs <= b.end && firstOurs > b.start ? firstOurs - 1 : null,
    };
  });

  // a token the indexer has minted has a fixed owner, which is what a probe would
  // return, so only the tokens it lacks go to the Cosmo API
  const owners = new Map<number, string>();
  const edgeTokens = [
    ...new Set(
      edges.flatMap((e) =>
        [e.end, e.endNext, e.start, e.startPrev, e.afterOurs, e.beforeOurs].filter(
          (tid): tid is number => tid !== null && tid >= 1,
        ),
      ),
    ),
  ];
  await chunk(edgeTokens, 1000, async (ids) => {
    const found = await indexer
      .select({ id: objekts.id, collectionId: objekts.collectionId })
      .from(objekts)
      .where(inArray(objekts.id, ids.map(String)));
    for (const o of found) if (o.collectionId) owners.set(parseInt(o.id), o.collectionId);
  });

  let judged = judgeEdges(edges, owners, t.id);
  const newestMint = rows.reduce((max, o) => Math.max(max, Date.parse(o.mintedAt)), 0);
  const probing = scope === "all" || (scope === "recent" && isRecent(newestMint, Date.now()));

  if (probing && judged.unknown.length > 0) {
    try {
      await chunk(judged.unknown, 6, async (ids) => {
        const results = await Promise.all(ids.map((tid) => probe(tid, targetSlug)));
        result.probes += ids.length;
        ids.forEach((tid, i) => {
          if (results[i] === "ours") owners.set(tid, t.id);
          else if (results[i] === "foreign") owners.set(tid, FOREIGN);
        });
      });
    } catch {
      logger.debug(`${t.slug}: Cosmo API error, skipping`);
      return { ...result, outcome: "failed" };
    }
    judged = judgeEdges(edges, owners, t.id);
  }

  reasons.push(...judged.reasons);
  const knownForeign = judged.foreign;

  if (reasons.length === 0) return result;

  result.drifted = true;
  result.outcome = "drift";
  logger.warn(`${t.slug}: drift — ${reasons.join("; ")}`);

  if (dryRun) return result;

  // fix: full rediscovery + recompute for this one collection
  let fresh: Batch[];
  try {
    fresh = await discoverBatches(t.cid, tokenIds);
  } catch {
    logger.debug(`${t.slug}: Cosmo API error during rediscovery, skipping`);
    return { ...result, outcome: "failed" };
  }
  const next = await fitRanges(t.id, t.season, fresh, rows, manualAnchors, {
    knownForeign: [...knownForeign, ...discoveryBoundaries(fresh)],
    dropSpanOf: spans.dropSpanOf,
  });
  if (next.batches.length === 0) return result;

  if (!(await storeRanges(t.id, batches, next))) {
    result.outcome = "unchanged";
    logger.debug(`${t.slug}: rediscovery gave back the stored batches, nothing written`);
    return result;
  }

  const updated = await rewriteSerials(rows, next.batches, manualAnchors, logger, t.slug);
  result.outcome = "fixed";
  logger.info(`${t.slug}: fixed — ${next.batches.length} batches, ${updated} serials updated`);
  return result;
}

export async function verifyBatchBoundaries(scope: ProbeScope, dryRun = false) {
  const targets = await loadTargets();

  verifyLog.debug(
    `${dryRun ? "DRY RUN — " : ""}checking ${targets.length} offline collections with stored batches, probes: ${scope}`,
  );

  let drifted = 0;
  let fixed = 0;
  let unchanged = 0;
  let gridSkipped = 0;
  let probes = 0;
  const failed: string[] = [];

  const spans = gridSpans();

  await chunk(targets, CONCURRENCY, async (group) => {
    const results = await Promise.all(
      group.map((t) => checkCollection(t, { scope, dryRun, spans, logger: verifyLog })),
    );
    for (const [i, r] of results.entries()) {
      if (r.drifted) drifted++;
      if (r.gridSkipped) gridSkipped++;
      probes += r.probes;
      if (r.outcome === "fixed") fixed++;
      if (r.outcome === "unchanged") unchanged++;
      if (r.outcome === "failed") failed.push(group[i]!.slug);
    }
  });

  const done = failed.length > 0 ? verifyLog.warn : drifted > 0 ? verifyLog.info : verifyLog.debug;
  done(
    `Done (probes: ${scope}, ${probes} Cosmo calls). ${drifted} drifted, ${dryRun ? "would fix" : "fixed"} ${fixed}` +
      (unchanged ? `, ${unchanged} unchanged after rediscovery` : "") +
      (gridSkipped ? `, ${gridSkipped} grid-fitted not probed` : "") +
      "." +
      (failed.length ? ` Failed (API): ${failed.length} — ${failed.join(", ")}` : ""),
  );
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;
// collections whose rediscovery changed nothing: the foreign tokens tried and until when to skip
// them; per process, so a restart retries each once
const stuck = new Map<string, { tried: Set<number>; until: number }>();
const recentBeat = heartbeat(verifyLog);

/**
 * The 15-minute pass: a foreign mint inside another collection's stored range
 * means that range is too wide, so only the collections whose ranges hold a
 * mint from the last 24 hours get the indexer checks. The window covers mint
 * times, since the held-transfer replay inserts objekts late with their
 * original mint time; a fixed range no longer holds the token, so overlapping
 * windows repeat nothing. A range too narrow shows as the collection's own
 * mint outside it, which the populate job already rediscovers.
 */
export async function verifyRecentDrift(dryRun = false) {
  const started = Date.now();
  const since = new Date(started - RECENT_WINDOW_MS).toISOString();
  const [minted, stored] = await Promise.all([
    indexer
      .select({ id: objekts.id, collectionId: objekts.collectionId })
      .from(objekts)
      .where(gt(objekts.mintedAt, since)),
    indexer
      .select({ id: collections.id, batches: collections.serialBatches })
      .from(collections)
      .where(isNotNull(collections.serialBatches)),
  ]);
  const candidates = driftCandidates(
    minted.map((o) => ({ id: parseInt(o.id), collectionId: o.collectionId })),
    stored.flatMap((c) =>
      (c.batches ?? []).map((b) => ({ collectionId: c.id, start: b.start, end: b.end })),
    ),
  );
  for (const [id, entry] of stuck) if (entry.until <= started) stuck.delete(id);
  const ids = [...candidates].flatMap(([id, tokens]) => {
    const entry = stuck.get(id);
    return entry && onlyTriedTokens(tokens, entry.tried) ? [] : [id];
  });
  recentBeat.count("runs");
  recentBeat.count("candidates", candidates.size);
  recentBeat.count("skipped as unfixable", candidates.size - ids.length);
  verifyLog.debug(
    `${dryRun ? "DRY RUN — " : ""}recent pass: ${minted.length} mints, ${candidates.size} candidate(s), ${candidates.size - ids.length} skipped as unfixable`,
  );

  const spans = gridSpans();
  const fixed: string[] = [];
  const failed: string[] = [];
  for (const target of ids.length > 0 ? await loadTargets(ids) : []) {
    let outcome: Awaited<ReturnType<typeof checkCollection>>["outcome"];
    try {
      ({ outcome } = await checkCollection(target, {
        scope: "none",
        dryRun,
        spans,
        logger: verifyLog,
      }));
    } catch (error) {
      // one bad candidate must not stop the rest, pass after pass
      verifyLog.debug(`${target.slug}: check failed: ${String(error)}`);
      outcome = "failed";
    }
    if (outcome === "fixed") fixed.push(target.slug);
    if (outcome === "failed") failed.push(target.slug);
    // rediscovery gave back the stored ranges (or none), so the same foreign tokens would
    // send it to the Cosmo API again on every pass for the rest of the window
    if (!dryRun && (outcome === "unchanged" || outcome === "drift")) {
      const entry = stuck.get(target.id);
      stuck.set(target.id, {
        tried: new Set([...(entry?.tried ?? []), ...candidates.get(target.id)!]),
        until: started + RECENT_WINDOW_MS,
      });
    }
  }
  recentBeat.count("fixed", fixed.length);
  recentBeat.count("failed", failed.length);
  recentBeat.flush();

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (fixed.length > 0) {
    verifyLog.info(`recent pass: fixed ${fixed.length} in ${seconds}s — ${fixed.join(", ")}`);
  }
  if (failed.length > 0) {
    verifyLog.warn(
      `recent pass: ${failed.length} drifted collection(s) not fixed — ${failed.join(", ")}`,
    );
  }
  verifyLog.debug(`recent pass done in ${seconds}s`);
}

if (import.meta.main) {
  if (process.env.RECENT === "1") {
    await verifyRecentDrift(process.env.DRY_RUN === "1");
    process.exit(0);
  }
  const env = process.env.PROBES;
  if (env !== undefined && !PROBE_SCOPES.includes(env as ProbeScope)) {
    throw new Error(`PROBES must be one of ${PROBE_SCOPES.join(", ")}`);
  }
  const scope = (env as ProbeScope | undefined) ?? "none";
  await verifyBatchBoundaries(scope, process.env.DRY_RUN === "1");
  process.exit(0);
}
