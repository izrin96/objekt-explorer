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
 * EDGE tokens of each un-anchored batch. On any drift it re-runs full discovery
 * for that one collection and rewrites the affected serials — so the expensive
 * path runs only for the few that actually moved.
 *
 *   DRY_RUN=1 bun run --env-file=../../.env src/script/verify-batch-boundaries.ts
 *   bun run --env-file=../../.env src/script/verify-batch-boundaries.ts
 */
import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { chunk, slugifyObjekt } from "@repo/lib";
import { and, asc, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { FetchError } from "ofetch";

import { computeOfflineSerials, discoverBatches, V1_CUTOFF_MS } from "@/job/populate-serial";

const excludeCollections = [
  "cream02-jiyeon-315z",
  "cream02-kotone-315z",
  "cream02-hayeon-315z",
  "cream02-jiwoo-315z",
  "cream02-xinyu-315z",
  "cream02-yeonji-315z",
];

const CONCURRENCY = 5;
const DB_BATCH_SIZE = 500;
const DRY_RUN = process.env.DRY_RUN === "1";

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
  `[verify] ${DRY_RUN ? "DRY RUN — " : ""}checking ${targets.length} offline collections with stored batches`,
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

  let drift = false;
  const reasons: string[] = [];
  try {
    for (const b of atRisk) {
      const [endTok, endNext, startTok, startPrev] = await Promise.all([
        probe(b.end, targetSlug),
        probe(b.end + 1, targetSlug),
        probe(b.start, targetSlug),
        probe(b.start - 1, targetSlug),
      ]);
      if (endTok === "foreign") reasons.push(`end ${b.end} is foreign (too big)`);
      if (endNext === "ours") reasons.push(`end+1 ${b.end + 1} is ours (too small)`);
      if (startTok === "foreign") reasons.push(`start ${b.start} is foreign`);
      if (startPrev === "ours") reasons.push(`start-1 ${b.start - 1} is ours (too small)`);
      if (
        endTok === "foreign" ||
        endNext === "ours" ||
        startTok === "foreign" ||
        startPrev === "ours"
      ) {
        drift = true;
      }
    }
  } catch {
    console.log(`[verify] ${t.slug}: API error, skipping`);
    failed.push(t.slug);
    return;
  }

  if (!drift) return;

  drifted++;
  console.log(`[verify] ${t.slug}: DRIFT — ${reasons.join("; ")}`);

  if (DRY_RUN) return;

  // fix: full rediscovery + recompute for this one collection
  let fresh: Batch[];
  try {
    fresh = await discoverBatches(
      t.cid,
      rows.map((r) => parseInt(r.id)),
    );
  } catch {
    console.log(`[verify] ${t.slug}: API error during rediscovery, skipping`);
    failed.push(t.slug);
    return;
  }
  if (fresh.length === 0) return;

  await indexer.update(collections).set({ serialBatches: fresh }).where(eq(collections.id, t.id));

  const computed = computeOfflineSerials(rows, fresh, V1_CUTOFF_MS);
  const byId = new Map(rows.map((o) => [o.id, o] as const));
  const updates: { id: string; newSerial: number }[] = [];
  for (const { id, serial } of computed) {
    const obj = byId.get(id)!;
    if (obj.serial > 0 && Date.parse(obj.mintedAt) < V1_CUTOFF_MS) continue;
    if (serial !== obj.serial) updates.push({ id, newSerial: serial });
  }

  if (updates.length > 0) {
    await indexer.transaction(async (tx) => {
      for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
        const slice = updates.slice(i, i + DB_BATCH_SIZE);
        const ids = slice.map((u) => u.id);
        const caseExpr = slice
          .map((u) => sql`WHEN ${u.id} THEN ${u.newSerial}`)
          .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);
        await tx
          .update(objekts)
          .set({ serial: sql`(CASE id ${caseExpr} END)::int` })
          .where(inArray(objekts.id, ids));
      }
    });
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
  `[verify] Done. ${drifted} drifted, ${DRY_RUN ? "would fix" : "fixed"} ${fixed}.` +
    (failed.length ? ` Failed (API): ${failed.length} — ${failed.join(", ")}` : ""),
);
process.exit(0);
