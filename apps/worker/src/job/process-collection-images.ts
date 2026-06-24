import { indexer } from "@repo/db/indexer";
import type { Collection } from "@repo/db/indexer/schema";
import { collections } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { S3Client } from "bun";
import { eq, ne } from "drizzle-orm";
import { ofetch } from "ofetch";

import { redis } from "@/lib/redis";
import { uploadWebp, s3Url, s3Config, BUCKET, FOLDER } from "@/lib/s3";

const BATCH_SIZE = 5;

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

  if (sourceIsWebp) {
    console.log("[process-images] Source is already WebP, skipping re-encode");
    return buffer;
  }

  return await img.webp({ quality: 80 }).toBuffer();
}

function computeHash(thumbnail: string, front: string, back: string) {
  const hasher = new Bun.CryptoHasher("md5");
  hasher.update(`${thumbnail}|${front}|${back}`);
  return hasher.digest("hex");
}

function needsImageProcessing(c: Collection) {
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
    .select()
    .from(collections)
    .where(ne(collections.slug, "empty-collection"));

  const needsProcessing = cols.filter(needsImageProcessing);

  if (needsProcessing.length === 0) {
    console.log("[process-images] All collections up to date");
    return;
  }

  console.log(`[process-images] ${needsProcessing.length} collections need processing`);

  let processed = 0;
  const total = needsProcessing.length;

  await chunk(needsProcessing, BATCH_SIZE, async (batch) => {
    await Promise.all(batch.map((c) => processOne(c)));
    processed += batch.length;
    console.log(`[process-images] Progress: ${processed}/${total}`);
  });

  console.log("[process-images] Done");
}

function s3DeleteKey(url: string): string {
  const idx = url.indexOf(`/${FOLDER}/`);
  if (idx === -1) throw new Error(`Cannot extract S3 key from URL: ${url}`);
  return url.slice(idx + 1);
}

async function processOne(c: Collection) {
  try {
    const slug = c.slug;

    const oldKeys: string[] = [];
    if (c.processedFrontImage) oldKeys.push(s3DeleteKey(c.processedFrontImage));
    if (c.processedThumbnailImage) oldKeys.push(s3DeleteKey(c.processedThumbnailImage));
    if (c.processedBackImage) oldKeys.push(s3DeleteKey(c.processedBackImage));

    const ts = Date.now();
    const frontKey = `front/${slug}-${ts}.webp`;
    const thumbKey = `thumbnail/${slug}-${ts}.webp`;
    const backKey = c.backImage ? `back/${slug}-${ts}.webp` : undefined;

    const images = await Promise.all([
      ofetch(replaceUrlSize(c.frontImage, "original"), { responseType: "arrayBuffer" }).then(
        (buf) => ({ key: frontKey, buf }),
      ),
      ofetch(replaceUrlSize(c.frontImage, "2x"), { responseType: "arrayBuffer" }).then((buf) => ({
        key: thumbKey,
        buf,
      })),
      ...(backKey
        ? [
            ofetch(replaceUrlSize(c.backImage, "original"), {
              responseType: "arrayBuffer",
            }).then((buf) => ({ key: backKey, buf })),
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

    for (const key of oldKeys) {
      try {
        await S3Client.delete(key, { ...s3Config, bucket: BUCKET });
      } catch {
        // old object may not exist
      }
    }

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

    await redis.set("collection:modified-at", new Date().toISOString());

    console.log(`[process-images] Processed ${slug}`);
  } catch (err) {
    console.error(`[process-images] Failed for ${c.slug}:`, err);
  }
}
