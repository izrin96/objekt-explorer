/**
 * Boundary drift verifier for un-anchored offline batches.
 *
 * Anchored batches (with a pre-cutoff v1 objekt) are shielded — their serials
 * come from the v1 anchor regardless of the stored range, so a drifted boundary
 * is harmless. Un-anchored batches (reserved entirely after the v1 cutoff) have
 * no ground truth, so a boundary that was guessed from an unminted (404) token
 * which later minted as *foreign* would silently shift their serials.
 *
 * This detects that cheaply: instead of a full gap scan, it probes only the
 * EDGE tokens of each un-anchored batch — the stored start/end plus the first
 * gap token past our own mints (the stored edge can sit in a still-unminted
 * stretch long after the foreign collection has minted right next to our
 * tokens, so probing next to our mints catches drift much earlier). On any
 * drift it re-runs full discovery for that one collection and rewrites the
 * affected serials — so the expensive path runs only for the few that moved.
 *
 * Runs weekly from the worker cron. Manual run:
 *   DRY_RUN=1 bun run --env-file=../../.env src/job/verify-batch-boundaries.ts
 *   bun run --env-file=../../.env src/job/verify-batch-boundaries.ts
 */
import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk, slugifyObjekt } from "@repo/lib";
import { and, asc, eq, inArray, isNotNull, ne, or } from "drizzle-orm";
import { FetchError } from "ofetch";

import {
  computeOfflineSerialUpdates,
  discoverBatches,
  V1_CUTOFF_MS,
  writeSerialUpdates,
} from "@/job/populate-serial";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";

const CONCURRENCY = 5;

type Batch = { start: number; end: number };
type Probe = "ours" | "foreign" | "unminted";

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

export async function verifyBatchBoundaries(dryRun = false) {
  // only collections that already have discovered ranges stored
  const targets = await indexer
    .select({
      id: collections.id,
      slug: collections.slug,
      cid: collections.collectionId,
      batches: collections.serialBatches,
    })
    .from(collections)
    .where(
      and(
        or(
          and(eq(collections.onOffline, "offline"), ne(collections.slug, "empty-collection")),
          inArray(collections.slug, excludeCollections),
        ),
        isNotNull(collections.serialBatches),
      ),
    );

  console.log(
    `[verify] ${dryRun ? "DRY RUN — " : ""}checking ${targets.length} offline collections with stored batches`,
  );

  let drifted = 0;
  let fixed = 0;
  const failed: string[] = [];

  async function processOne(t: { id: string; slug: string; cid: string; batches: Batch[] | null }) {
    const batches = t.batches ?? [];
    if (batches.length === 0) return;

    const rows = await indexer
      .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
      .from(objekts)
      .where(eq(objekts.collectionId, t.id))
      .orderBy(asc(objekts.id));

    if (rows.length === 0) return;

    const isAnchored = (b: Batch) =>
      rows.some((o) => {
        const tid = parseInt(o.id);
        return (
          o.serial > 0 && Date.parse(o.mintedAt) < V1_CUTOFF_MS && tid >= b.start && tid <= b.end
        );
      });

    // only un-anchored batches are at risk (anchored ones are shielded by v1)
    const atRisk = batches.filter((b) => !isAnchored(b));
    if (atRisk.length === 0) return;

    const targetSlug = slugifyObjekt(t.cid);
    const tokenIds = rows.map((o) => parseInt(o.id));

    // the frontier (last) batch's end is provisional by design — it grows with
    // every new mint, and the populate job already extends it incrementally.
    // Probing its end would flag normal growth as drift and trigger a full
    // rediscovery for nothing, so only its start side is checked.
    const frontier = batches[batches.length - 1]!;

    const reasons: string[] = [];
    try {
      for (const b of atRisk) {
        const isFrontier = b === frontier;
        // our lowest/highest minted token inside the batch: the stored edges can
        // sit in a still-unminted stretch, so the token right next to our own
        // mints is the earliest place foreign drift becomes observable
        let firstOurs = Infinity;
        let lastOurs = -Infinity;
        for (const tid of tokenIds) {
          if (tid < b.start || tid > b.end) continue;
          if (tid < firstOurs) firstOurs = tid;
          if (tid > lastOurs) lastOurs = tid;
        }
        const afterOursTid = lastOurs >= b.start && lastOurs < b.end ? lastOurs + 1 : null;
        const beforeOursTid = firstOurs <= b.end && firstOurs > b.start ? firstOurs - 1 : null;

        const [endTok, endNext, startTok, startPrev, afterOurs, beforeOurs] = await Promise.all([
          isFrontier ? Promise.resolve(null) : probe(b.end, targetSlug),
          isFrontier ? Promise.resolve(null) : probe(b.end + 1, targetSlug),
          probe(b.start, targetSlug),
          probe(b.start - 1, targetSlug),
          afterOursTid === null || isFrontier
            ? Promise.resolve(null)
            : probe(afterOursTid, targetSlug),
          beforeOursTid === null ? Promise.resolve(null) : probe(beforeOursTid, targetSlug),
        ]);
        if (endTok === "foreign") reasons.push(`end ${b.end} is foreign (too big)`);
        if (endNext === "ours") reasons.push(`end+1 ${b.end + 1} is ours (too small)`);
        if (startTok === "foreign") reasons.push(`start ${b.start} is foreign`);
        if (startPrev === "ours") reasons.push(`start-1 ${b.start - 1} is ours (too small)`);
        // "ours" here just means our own mint the indexer hasn't caught up on —
        // only foreign proves the reserved range is smaller than stored
        if (afterOurs === "foreign") {
          reasons.push(`gap token ${afterOursTid} after last ours is foreign (end too big)`);
        }
        if (beforeOurs === "foreign") {
          reasons.push(`gap token ${beforeOursTid} below first ours is foreign (start too small)`);
        }
      }
    } catch {
      console.log(`[verify] ${t.slug}: API error, skipping`);
      failed.push(t.slug);
      return;
    }

    if (reasons.length === 0) return;

    drifted++;
    console.log(`[verify] ${t.slug}: DRIFT — ${reasons.join("; ")}`);

    if (dryRun) return;

    // fix: full rediscovery + recompute for this one collection
    let fresh: Batch[];
    try {
      fresh = await discoverBatches(t.cid, tokenIds);
    } catch {
      console.log(`[verify] ${t.slug}: API error during rediscovery, skipping`);
      failed.push(t.slug);
      return;
    }
    if (fresh.length === 0) return;

    await indexer.update(collections).set({ serialBatches: fresh }).where(eq(collections.id, t.id));

    const updates = computeOfflineSerialUpdates(rows, fresh);

    if (updates.length > 0) {
      await writeSerialUpdates(updates);
    }

    fixed++;
    console.log(
      `[verify] ${t.slug}: fixed — ${fresh.length} batches, ${updates.length} serials updated`,
    );
  }

  await chunk(targets, CONCURRENCY, async (group) => {
    await Promise.all(group.map((t) => processOne(t)));
  });

  console.log(
    `[verify] Done. ${drifted} drifted, ${dryRun ? "would fix" : "fixed"} ${fixed}.` +
      (failed.length ? ` Failed (API): ${failed.length} — ${failed.join(", ")}` : ""),
  );
}

if (import.meta.main) {
  await verifyBatchBoundaries(process.env.DRY_RUN === "1");
  process.exit(0);
}
