import { indexer } from "@repo/db/indexer";
import type { Collection } from "@repo/db/indexer/schema";
import { collections } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { ofetch } from "ofetch";

import { redis } from "@/lib/redis";
import { uploadWebp, s3Url } from "@/lib/s3";

const BATCH_SIZE = 5;

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

function computeHash(thumbnail: string, front: string, back: string) {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(`${thumbnail}|${front}|${back}`);
  return hasher.digest("hex");
}

type CollectionRow = Pick<
  Collection,
  | "slug"
  | "thumbnailImage"
  | "frontImage"
  | "backImage"
  | "imageSyncHash"
  | "processedFrontImage"
  | "processedThumbnailImage"
  | "processedBackImage"
>;

function needsImageProcessing(c: CollectionRow) {
  if (
    c.imageSyncHash === null ||
    c.processedFrontImage === null ||
    c.processedThumbnailImage === null
  ) {
    return true;
  }

  if (c.backImage !== "" && c.processedBackImage === null) {
    return true;
  }

  const hash = computeHash(c.thumbnailImage, c.frontImage, c.backImage);
  return hash !== c.imageSyncHash;
}

export async function processCollectionImages() {
  const cols = await indexer
    .select({
      slug: collections.slug,
      thumbnailImage: collections.thumbnailImage,
      frontImage: collections.frontImage,
      backImage: collections.backImage,
      imageSyncHash: collections.imageSyncHash,
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
          sql`md5(${collections.thumbnailImage} || '|' || ${collections.frontImage} || '|' || ${collections.backImage}) != ${collections.imageSyncHash}`,
        ),
      ),
    );

  const needsProcessing = cols.filter(needsImageProcessing);

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

async function processOne(c: CollectionRow) {
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
      }),
    );

    const hash = computeHash(c.thumbnailImage, c.frontImage, c.backImage);

    await indexer
      .update(collections)
      .set({
        processedFrontImage: s3Url(frontKey),
        processedThumbnailImage: s3Url(thumbKey),
        ...(backKey ? { processedBackImage: s3Url(backKey) } : {}),
        imageSyncHash: hash,
      })
      .where(eq(collections.slug, slug));

    console.log(`[process-images] Processed ${slug}`);
    return true;
  } catch (err) {
    console.error(`[process-images] Failed for ${c.slug}:`, err);
    return false;
  }
}
