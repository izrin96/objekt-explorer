import { indexer } from "@repo/db/indexer";
import type { Collection } from "@repo/db/indexer/schema";
import { collections } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { ofetch } from "ofetch";

import { redis } from "@/lib/redis";
import { deleteObject, FOLDER, keyFromUrl, s3Url, uploadWebp } from "@/lib/s3";

const BATCH_SIZE = 5;

const LOCK_KEY = "lock:process-collection-images";
// generous enough to cover a full backlog run, short enough that a crashed
// worker does not wedge the job for long
const LOCK_TTL_SECONDS = 1800;

const FETCH_OPTS = {
  responseType: "arrayBuffer",
  timeout: 30_000,
  retry: 2,
  retryDelay: 1000,
} as const;

function isWebp(buf: ArrayBuffer) {
  const u8 = new Uint8Array(buf);
  return u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46;
}

function replaceUrlSize(url: string, size: string) {
  return url.replace(/(4x|3x|2x|thumbnail|original)$/i, size);
}

async function convertToWebp(buf: ArrayBuffer, maxHeight?: number) {
  const buffer = Buffer.from(buf);
  const sourceIsWebp = isWebp(buf);

  if (sourceIsWebp && !maxHeight) {
    console.log("[process-images] Source is already WebP, skipping re-encode");
    return buffer;
  }

  const img = new Bun.Image(buffer);
  const { width, height } = await img.metadata();

  if (maxHeight && height > maxHeight) {
    const newWidth = Math.round(width * (maxHeight / height));
    const opts = sourceIsWebp ? ({ lossless: true } as const) : ({ quality: 80 } as const);
    return await img
      .resize(newWidth || 1, maxHeight)
      .webp(opts)
      .toBuffer();
  }

  if (sourceIsWebp) return buffer;

  return await img.webp({ quality: 80 }).toBuffer();
}

// thumbnailImage is deliberately not part of the hash: the thumbnail is derived
// from frontImage at 2x, so thumbnailImage is never a fetch source and a change
// to it alone would queue a pointless reprocess. Must stay in sync with the md5
// expression in the query below.
function computeHash(front: string, back: string) {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(`${front}|${back}`);
  return hasher.digest("hex");
}

type CollectionRow = Pick<
  Collection,
  | "slug"
  | "frontImage"
  | "backImage"
  | "processedFrontImage"
  | "processedThumbnailImage"
  | "processedBackImage"
>;

export async function processCollectionImages() {
  // the cron fires every 10 minutes but a backlog run can take longer; without
  // a lock the overlapping run re-selects the same rows (their hash is still
  // stale) and uploads every image twice
  const token = crypto.randomUUID();
  // variadic overload takes string args only
  const acquired = await redis.set(LOCK_KEY, token, "NX", "EX", String(LOCK_TTL_SECONDS));

  if (acquired === null) {
    console.log("[process-images] Another run holds the lock, skipping");
    return;
  }

  try {
    await run();
  } finally {
    // only release our own lock: if it already expired mid-run, another worker
    // may legitimately hold it now
    if ((await redis.get(LOCK_KEY)) === token) {
      await redis.del(LOCK_KEY);
    }
  }
}

async function run() {
  const needsProcessing = await indexer
    .select({
      slug: collections.slug,
      frontImage: collections.frontImage,
      backImage: collections.backImage,
      processedFrontImage: collections.processedFrontImage,
      processedThumbnailImage: collections.processedThumbnailImage,
      processedBackImage: collections.processedBackImage,
    })
    .from(collections)
    .where(
      and(
        ne(collections.slug, "empty-collection"),
        or(
          isNull(collections.imageSyncHash),
          isNull(collections.processedFrontImage),
          isNull(collections.processedThumbnailImage),
          and(ne(collections.backImage, ""), isNull(collections.processedBackImage)),
          sql`md5(${collections.frontImage} || '|' || ${collections.backImage}) != ${collections.imageSyncHash}`,
        ),
      ),
    );

  if (needsProcessing.length === 0) {
    console.log("[process-images] All collections up to date");
    return;
  }

  console.log(`[process-images] ${needsProcessing.length} collections need processing`);

  let processed = 0;
  const total = needsProcessing.length;
  let succeeded = 0;
  let failed = 0;

  await chunk(needsProcessing, BATCH_SIZE, async (batch) => {
    const results = await Promise.all(batch.map((c) => processOne(c)));
    for (const ok of results) {
      if (ok) succeeded++;
      else failed++;
    }
    processed += batch.length;
    console.log(`[process-images] Progress: ${processed}/${total}`);
  });

  if (succeeded > 0) {
    await redis.set("collection:modified-at", new Date().toISOString());
  }

  console.log(`[process-images] Done: ${succeeded} succeeded, ${failed} failed`);
}

/**
 * Best-effort delete. A failure here only leaves an orphan behind, which the
 * cleanup-orphaned-collection-images script sweeps up, so it must never fail
 * the collection it belongs to.
 */
async function deleteQuietly(keys: string[]) {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await deleteObject(key);
      } catch (err) {
        console.error(`[process-images] Failed to delete ${key}:`, err);
      }
    }),
  );
}

async function processOne(c: CollectionRow) {
  // keys written during this attempt, so a mid-flight failure can roll them
  // back instead of stranding objects no DB row points at
  const uploaded: string[] = [];

  try {
    const slug = c.slug;

    const ts = Date.now();
    const frontKey = `front/${slug}-${ts}.webp`;
    const thumbKey = `thumbnail/${slug}-${ts}.webp`;
    const backKey = c.backImage ? `back/${slug}-${ts}.webp` : undefined;

    const images = await Promise.all([
      ofetch(replaceUrlSize(c.frontImage, "original"), FETCH_OPTS).then((buf) => ({
        key: frontKey,
        buf,
      })),
      ofetch(replaceUrlSize(c.frontImage, "2x"), FETCH_OPTS).then((buf) => ({
        key: thumbKey,
        buf,
      })),
      ...(backKey
        ? [
            ofetch(replaceUrlSize(c.backImage, "original"), FETCH_OPTS).then((buf) => ({
              key: backKey,
              buf,
            })),
          ]
        : []),
    ]);

    await Promise.all(
      images.map(async ({ key, buf }) => {
        const maxHeight = key === thumbKey ? 900 : undefined;
        const webp = await convertToWebp(buf, maxHeight);
        await uploadWebp(key, webp);
        uploaded.push(`${FOLDER}/${key}`);
      }),
    );

    const hash = computeHash(c.frontImage, c.backImage);

    await indexer
      .update(collections)
      .set({
        processedFrontImage: s3Url(frontKey),
        processedThumbnailImage: s3Url(thumbKey),
        // null when the collection no longer has a back image, so the column
        // does not keep pointing at the object the cleanup below deletes
        processedBackImage: backKey ? s3Url(backKey) : null,
        imageSyncHash: hash,
      })
      .where(eq(collections.slug, slug));

    // the row no longer points at the previous upload, so drop it. Only after
    // the update commits, otherwise a failed update would leave the live URLs
    // pointing at deleted objects
    const superseded = [c.processedFrontImage, c.processedThumbnailImage, c.processedBackImage]
      .filter((url) => url !== null)
      .map(keyFromUrl)
      .filter((key) => key !== null)
      .filter((key) => !uploaded.includes(key));

    if (superseded.length > 0) {
      await deleteQuietly(superseded);
    }

    console.log(`[process-images] Processed ${slug}`);
    return true;
  } catch (err) {
    console.error(`[process-images] Failed for ${c.slug}:`, err);
    // nothing references these yet, so removing them is safe and keeps a
    // retry loop from piling up orphans
    await deleteQuietly(uploaded);
    return false;
  }
}
