/**
 * Puts staff collection colours back on the indexer from their history: each slug's latest
 * `collection_override` audit entry in the app database is applied to its `collection` row, the
 * colour it sets kept beside the row's own as the source, a colour it reset put back to the
 * source. Run it after an indexer resync from scratch, and once before the deploy that moved the
 * colours onto the row.
 *
 * A dry run by default: it reads with plain SELECTs, so it runs on a read-only connection, and
 * prints each slug's colours and the target. APPLY=1 locks each row, plans again under the lock and
 * writes; it adds no audit entry, since it restores history rather than adding to it, and bumps
 * `collection:modified-at` when anything changed.
 *
 *   bun run --env-file=../../.env --env-file=../../.env.local src/script/replay-collection-colours.ts
 *   APPLY=1 bun run --env-file=../../.env src/script/replay-collection-colours.ts
 */
import { nextModifiedAt } from "@repo/api/lib/collection-bump";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { modAudit } from "@repo/db/schema";
import { chunkMap } from "@repo/lib";
import {
  type ColourRow,
  type OverrideColours,
  isStaffColour,
  planReplay,
} from "@repo/lib/collection-colours";
import { colourColumns, lockColourRow, writeColourSet } from "@repo/lib/server/collection-colours";
import { and, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

const APPLY = process.env.APPLY === "1";
const CHUNK = 500;

const slugOfEntry = sql<string>`${modAudit.detail}->>'slug'`;

function afterOf(detail: unknown): OverrideColours | null {
  const after = (detail as { after?: Record<string, unknown> } | null)?.after;
  if (!after) return null;
  const colour = (value: unknown) =>
    value === null || value === undefined ? null : isStaffColour(value) ? value : undefined;
  const textColor = colour(after.textColor);
  const backgroundColor = colour(after.backgroundColor);
  if (textColor === undefined || backgroundColor === undefined) return null;
  return { textColor, backgroundColor };
}

const showRow = (row: ColourRow) =>
  `text ${row.textColor}${row.sourceTextColor === null ? "" : ` (source ${row.sourceTextColor})`}, ` +
  `background ${row.backgroundColor}${row.sourceBackgroundColor === null ? "" : ` (source ${row.sourceBackgroundColor})`}`;

const showTarget = (after: OverrideColours) =>
  `text ${after.textColor ?? "source"}, background ${after.backgroundColor ?? "source"}`;

/** Each slug's latest `collection_override` entry, or only `slug`'s. */
const latestEntries = (slug?: string) =>
  db
    .selectDistinctOn([slugOfEntry], { slug: slugOfEntry, detail: modAudit.detail })
    .from(modAudit)
    .where(
      and(
        eq(modAudit.action, "collection_override"),
        slug === undefined ? undefined : eq(slugOfEntry, slug),
      ),
    )
    .orderBy(slugOfEntry, desc(modAudit.createdAt), desc(modAudit.id));

const entries = await latestEntries();

const slugs = entries.map((entry) => entry.slug);
const [rows, overridden] = await Promise.all([
  chunkMap(slugs, CHUNK, (batch) =>
    indexer
      .select({ slug: collections.slug, ...colourColumns })
      .from(collections)
      .where(inArray(collections.slug, batch)),
  ),
  indexer
    .select({ slug: collections.slug })
    .from(collections)
    .where(
      or(isNotNull(collections.sourceTextColor), isNotNull(collections.sourceBackgroundColor)),
    ),
]);
const rowOf = new Map(rows.map((row) => [row.slug, row]));

const missing: string[] = [];
const unreadable: string[] = [];
const planned: string[] = [];

for (const entry of entries) {
  const after = afterOf(entry.detail);
  if (!after) {
    unreadable.push(entry.slug);
    continue;
  }
  const row = rowOf.get(entry.slug);
  if (!row) {
    missing.push(entry.slug);
    continue;
  }
  const set = planReplay(row, after);
  if (!set) continue;
  planned.push(entry.slug);
  console.log(`${entry.slug}: now ${showRow(row)}; to ${showTarget(after)}`);
}

const withHistory = new Set(slugs);
const noHistory = overridden.map((row) => row.slug).filter((slug) => !withHistory.has(slug));

console.log(
  `\n${entries.length} slugs with history, ${planned.length} to change, ${entries.length - planned.length - missing.length - unreadable.length} already match`,
);
if (missing.length > 0) console.log(`No collection has: ${missing.join(", ")}`);
if (unreadable.length > 0) {
  console.log(`Latest entry has no valid colours, skipped: ${unreadable.join(", ")}`);
}
if (noHistory.length > 0) {
  console.log(`Staff colour set but no history: ${noHistory.join(", ")}`);
}

if (!APPLY) {
  if (planned.length > 0) console.log("\nDry run: nothing written. APPLY=1 writes.");
  process.exit(0);
}

let written = 0;
for (const slug of planned) {
  const wrote = await indexer.transaction(async (tx) => {
    const row = await lockColourRow(tx, slug);
    // a save commits its entry while it holds this lock, so the entry read now is the latest
    const [entry] = await latestEntries(slug);
    const after = afterOf(entry?.detail);
    const set = row && after ? planReplay(row, after) : null;
    if (!set) return false;
    await writeColourSet(tx, slug, set);
    return true;
  });
  if (wrote) written++;
}
console.log(`\nWrote ${written} collections.`);

if (written > 0) {
  // imported here, so a dry run never opens a Redis connection
  const { redis } = await import("@/lib/redis");
  const previous = await redis.get("collection:modified-at");
  await redis.set(
    "collection:modified-at",
    new Date(nextModifiedAt(Date.now(), previous)).toISOString(),
  );
  console.log("Bumped collection:modified-at.");
}
process.exit(0);
