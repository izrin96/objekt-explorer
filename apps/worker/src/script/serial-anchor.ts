/**
 * Manage manual serial anchors: reported (tokenId, serial) pairs that pin the
 * batch their token sits in, like a v1 serial does (see lib/serial-math.ts).
 *
 *   add <tokenId> <serial> <note…>   add an anchor, or replace the one on that token
 *   remove <tokenId>                 remove the anchor on that token
 *   list [slug]                      print anchors as ready-to-run add commands
 *
 * add and remove are a dry run by default: they print the collection, the
 * objekt's current serial and the serials that would change. APPLY=1 stores
 * the anchor and rewrites the collection's serials in one transaction.
 *
 *   bun run --env-file=../../.env src/script/serial-anchor.ts add 29519351 38 "reported on Discord"
 *   APPLY=1 bun run --env-file=../../.env src/script/serial-anchor.ts add 29519351 38 "reported on Discord"
 *   APPLY=1 bun run --env-file=../../.env src/script/serial-anchor.ts remove 29519351
 *   bun run --env-file=../../.env src/script/serial-anchor.ts list [slug]
 *
 * Requires the serial_anchors migration to be applied first.
 */
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

import { writeSerialUpdates } from "@/job/populate-serial";
import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";
import { checkManualAnchor, computeOfflineSerialUpdates } from "@/lib/serial-math";

const APPLY = process.env.APPLY === "1";
const SAMPLE = 10;

type StoredAnchor = { tokenId: number; serial: number; note: string; addedAt: string };

function fail(message: string): never {
  console.error(`[serial-anchor] refused: ${message}`);
  process.exit(1);
}

function parseInteger(value: string | undefined, name: string) {
  const n = Number(value);
  if (value === undefined || !Number.isInteger(n)) fail(`${name} must be an integer`);
  return n;
}

async function loadCollection(tokenId: number) {
  const [objekt] = await indexer
    .select({ collectionId: objekts.collectionId })
    .from(objekts)
    .where(eq(objekts.id, String(tokenId)))
    .limit(1);
  if (!objekt?.collectionId) fail(`token ${tokenId} was not found in the indexer`);

  const [collection] = await indexer
    .select({
      id: collections.id,
      slug: collections.slug,
      onOffline: collections.onOffline,
      batches: collections.serialBatches,
      anchors: collections.serialAnchors,
    })
    .from(collections)
    .where(eq(collections.id, objekt.collectionId))
    .limit(1);
  if (!collection) fail(`the collection of token ${tokenId} was not found`);

  const offline =
    (collection.onOffline === "offline" && collection.slug !== "empty-collection") ||
    excludeCollections.includes(collection.slug);
  if (!offline) fail(`${collection.slug} is an online collection; it has no reserved batches`);

  const rows = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(eq(objekts.collectionId, collection.id))
    .orderBy(asc(objekts.id));

  return { collection, rows };
}

function report(
  slug: string,
  tokenId: number,
  currentSerial: number,
  updates: { id: string; newSerial: number }[],
  rows: { id: string; serial: number }[],
) {
  const serialOf = new Map(rows.map((o) => [o.id, o.serial] as const));
  const deltas = updates.map((u) => u.newSerial - serialOf.get(u.id)!);
  console.log(`[serial-anchor] ${slug}: token ${tokenId} currently serial ${currentSerial}`);
  if (updates.length === 0) {
    console.log("[serial-anchor] no serials would change");
    return;
  }
  console.log(
    `[serial-anchor] ${updates.length} serial(s) would change by ${Math.min(...deltas)}..${Math.max(...deltas)}`,
  );
  for (const u of updates.slice(0, SAMPLE)) {
    console.log(`  ${u.id}: ${serialOf.get(u.id)} → ${u.newSerial}`);
  }
  if (updates.length > SAMPLE) console.log(`  (+${updates.length - SAMPLE} more)`);
}

async function change(tokenId: number, next: (existing: StoredAnchor[]) => StoredAnchor[]) {
  const { collection, rows } = await loadCollection(tokenId);
  const existing = collection.anchors ?? [];
  const anchors = next(existing);
  const batches = collection.batches ?? [];

  const updates = computeOfflineSerialUpdates(rows, batches, anchors);
  const current = rows.find((o) => parseInt(o.id) === tokenId)!;
  const previous = existing.find((a) => a.tokenId === tokenId);
  const added = anchors.find((a) => a.tokenId === tokenId);

  if (previous) {
    console.log(`[serial-anchor] existing anchor on ${tokenId}: serial ${previous.serial}`);
  }
  if (added) {
    console.log(`[serial-anchor] new anchor on ${tokenId}: serial ${added.serial}`);
    const reason = checkManualAnchor(rows, batches, added, anchors);
    if (reason) fail(reason);
  } else if (!previous) {
    fail(`token ${tokenId} has no anchor`);
  }
  report(collection.slug, tokenId, current.serial, updates, rows);

  if (!APPLY) {
    console.log("[serial-anchor] DRY RUN — nothing written; APPLY=1 to write");
    return;
  }

  await indexer.transaction(async (tx) => {
    await tx
      .update(collections)
      .set({ serialAnchors: anchors.length > 0 ? anchors : null })
      .where(eq(collections.id, collection.id));
    await writeSerialUpdates(updates, tx);
  });

  const after = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(eq(objekts.collectionId, collection.id))
    .orderBy(asc(objekts.id));
  const remaining = computeOfflineSerialUpdates(after, batches, anchors);
  console.log(
    remaining.length === 0
      ? `[serial-anchor] applied; read back: 0 differences`
      : `[serial-anchor] applied; read back: ${remaining.length} difference(s) remain (a concurrent populate run?)`,
  );
}

async function list(slug: string | undefined) {
  const rows = await indexer
    .select({ slug: collections.slug, anchors: collections.serialAnchors })
    .from(collections)
    .where(
      and(
        isNotNull(collections.serialAnchors),
        sql`jsonb_array_length(${collections.serialAnchors}) > 0`,
        slug ? eq(collections.slug, slug) : undefined,
      ),
    )
    .orderBy(asc(collections.slug));
  for (const c of rows) {
    console.log(`# ${c.slug}`);
    for (const a of c.anchors ?? []) {
      console.log(`add ${a.tokenId} ${a.serial} ${JSON.stringify(a.note)}  # ${a.addedAt}`);
    }
  }
}

const [command, ...args] = process.argv.slice(2);

if (command === "add") {
  const tokenId = parseInteger(args[0], "tokenId");
  const serial = parseInteger(args[1], "serial");
  const note = args.slice(2).join(" ").trim();
  if (!note) fail("a note saying where the report came from is required");
  await change(tokenId, (existing) => [
    ...existing.filter((a) => a.tokenId !== tokenId),
    { tokenId, serial, note, addedAt: new Date().toISOString() },
  ]);
} else if (command === "remove") {
  const tokenId = parseInteger(args[0], "tokenId");
  await change(tokenId, (existing) => existing.filter((a) => a.tokenId !== tokenId));
} else if (command === "list") {
  await list(args[0]);
} else {
  console.error(
    "usage: serial-anchor.ts add <tokenId> <serial> <note…> | remove <tokenId> | list [slug]",
  );
  process.exit(1);
}
process.exit(0);
