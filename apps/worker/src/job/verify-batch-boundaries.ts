/**
 * Boundary drift verifier for un-anchored offline batches.
 *
 * Anchored batches (with a pre-cutoff v1 objekt or a manual anchor) are
 * shielded — their serials come from the anchor regardless of the stored range,
 * so a drifted boundary is harmless. Un-anchored batches (reserved entirely after the v1 cutoff) have
 * no ground truth, so a boundary that was guessed from an unminted (404) token
 * which later minted as *foreign* would silently shift their serials.
 *
 * This detects that cheaply: instead of a full gap scan, it checks only the
 * EDGE tokens of each un-anchored batch — the stored start/end plus the first
 * gap token past our own mints. The indexer judges every edge token it has
 * minted; only the tokens it lacks go to the Cosmo API, and only on a probe
 * run (`probeScopeFor`: recent collections on Mondays, all on the first
 * Monday of the month). On any drift it re-runs full discovery for that one
 * collection and rewrites the affected serials.
 *
 * It also asks the indexer whether a foreign objekt has minted inside a stored
 * range. That catches a reserved block that refineBatches claimed from a gap
 * but which turned out to belong to another collection.
 *
 * Runs daily from the worker cron. Manual run (PROBES=none|recent|all, default
 * today's scheduled scope):
 *   DRY_RUN=1 PROBES=none bun run --env-file=../../.env src/job/verify-batch-boundaries.ts
 *   bun run --env-file=../../.env src/job/verify-batch-boundaries.ts
 */
import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk, slugifyObjekt } from "@repo/lib";
import { and, asc, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { FetchError } from "ofetch";

import {
  applyGrids,
  type DropKey,
  discoverBatches,
  fittedMemberRun,
  isGridDrop,
  loadDrop,
  type MemberKey,
  refineBatches,
  tokenIdRange,
  writeSerialUpdates,
} from "@/job/serial-batches";
import { fitDropGrid, insideDrop } from "@/lib/drop-grid";
import { log } from "@/lib/log";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";
import {
  computeOfflineSerialUpdates,
  shiftedSerials,
  discoveryBoundaries,
  type ManualAnchor,
  V1_CUTOFF_MS,
} from "@/lib/serial-math";
import {
  type BatchEdges,
  isRecent,
  judgeEdges,
  PROBE_SCOPES,
  probeScopeFor,
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

export async function verifyBatchBoundaries(scope: ProbeScope, dryRun = false) {
  // only collections that already have discovered ranges stored, with a batch no v1 objekt anchors
  const targets = await indexer
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

  verifyLog.debug(
    `${dryRun ? "DRY RUN — " : ""}checking ${targets.length} offline collections with stored batches, probes: ${scope}`,
  );

  let drifted = 0;
  let fixed = 0;
  let unchanged = 0;
  let gridSkipped = 0;
  let probes = 0;
  const failed: string[] = [];

  // each drop is fitted once per run: the span of a grid-fitted drop, else null
  const dropSpans = new Map<string, Promise<{ start: number; end: number } | null>>();
  const dropSpanOf = (key: DropKey) => {
    const name = `${key.season}|${key.collectionNo}|${key.artist}`;
    let span = dropSpans.get(name);
    if (!span) {
      span = loadDrop(key).then((drop) => {
        const grid = drop ? fitDropGrid(drop.region).grid : null;
        return drop && grid ? { start: drop.region.start, end: grid.end } : null;
      });
      dropSpans.set(name, span);
    }
    return span;
  };

  const dropFitted = (key: DropKey) => dropSpanOf(key).then((span) => span !== null);

  const runSpans = new Map<string, Promise<{ start: number; end: number } | null>>();
  const runSpanOf = (key: MemberKey, collectionId: string) => {
    let span = runSpans.get(collectionId);
    if (!span) {
      span = fittedMemberRun(key, collectionId, undefined, dropFitted).then((run) => {
        const value = run ? { start: run.region.start, end: run.grid.end } : null;
        for (const m of run?.members ?? []) runSpans.set(m.id, Promise.resolve(value));
        return value;
      });
      runSpans.set(collectionId, span);
    }
    return span;
  };

  async function processOne(t: {
    id: string;
    slug: string;
    cid: string;
    season: string;
    collectionNo: string;
    artist: DropKey["artist"];
    member: string;
    onOffline: string;
    batches: Batch[] | null;
    anchors: ManualAnchor[] | null;
  }) {
    const batches = t.batches ?? [];
    if (batches.length === 0) return;

    const rows = await indexer
      .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
      .from(objekts)
      .where(eq(objekts.collectionId, t.id))
      .orderBy(asc(objekts.id));

    if (rows.length === 0) return;

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
    if (atRisk.length === 0) return;

    // a grid-fitted drop's foreign neighbours already confirm its slot edges, so
    // only the indexer check below covers those batches
    const spans = isGridDrop(t)
      ? [await dropSpanOf(t), await runSpanOf(t, t.id)].filter((s) => s !== null)
      : [];
    const toProbe = atRisk.filter((b) => !spans.some((span) => insideDrop(b, span)));
    if (toProbe.length < atRisk.length) {
      gridSkipped++;
      verifyLog.debug(`${t.slug}: ${atRisk.length - toProbe.length} grid batch(es), not probed`);
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
          probes += ids.length;
          ids.forEach((tid, i) => {
            if (results[i] === "ours") owners.set(tid, t.id);
            else if (results[i] === "foreign") owners.set(tid, FOREIGN);
          });
        });
      } catch {
        verifyLog.debug(`${t.slug}: Cosmo API error, skipping`);
        failed.push(t.slug);
        return;
      }
      judged = judgeEdges(edges, owners, t.id);
    }

    reasons.push(...judged.reasons);
    const knownForeign = judged.foreign;

    if (reasons.length === 0) return;

    drifted++;
    verifyLog.warn(`${t.slug}: drift — ${reasons.join("; ")}`);

    if (dryRun) return;

    // fix: full rediscovery + recompute for this one collection
    let fresh: Batch[];
    try {
      fresh = await discoverBatches(t.cid, tokenIds);
    } catch {
      verifyLog.debug(`${t.slug}: Cosmo API error during rediscovery, skipping`);
      failed.push(t.slug);
      return;
    }
    fresh = await refineBatches(t.season, fresh, tokenIds, [
      ...knownForeign,
      ...discoveryBoundaries(fresh),
    ]);
    fresh = await applyGrids(t.id, fresh, dropFitted);
    if (fresh.length === 0) return;

    const same =
      fresh.length === batches.length &&
      fresh.every((b, i) => b.start === batches[i]!.start && b.end === batches[i]!.end);
    if (same) {
      unchanged++;
      verifyLog.debug(`${t.slug}: rediscovery gave back the stored batches, nothing written`);
      return;
    }

    await indexer.update(collections).set({ serialBatches: fresh }).where(eq(collections.id, t.id));

    const updates = computeOfflineSerialUpdates(rows, fresh, manualAnchors);

    if (updates.length > 0) {
      await writeSerialUpdates(updates);
    }
    const shift = shiftedSerials(rows, updates);
    if (shift) {
      verifyLog.warn(
        `${t.slug}: ${shift.count} shown serial(s) moved by ${shift.min}..${shift.max}`,
      );
    }

    fixed++;
    verifyLog.info(`${t.slug}: fixed — ${fresh.length} batches, ${updates.length} serials updated`);
  }

  await chunk(targets, CONCURRENCY, async (group) => {
    await Promise.all(group.map((t) => processOne(t)));
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

if (import.meta.main) {
  const env = process.env.PROBES;
  if (env !== undefined && !PROBE_SCOPES.includes(env as ProbeScope)) {
    throw new Error(`PROBES must be one of ${PROBE_SCOPES.join(", ")}`);
  }
  const scope = (env as ProbeScope | undefined) ?? probeScopeFor(new Date());
  await verifyBatchBoundaries(scope, process.env.DRY_RUN === "1");
  process.exit(0);
}
