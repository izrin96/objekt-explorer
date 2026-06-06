import { indexer } from "@repo/db/indexer";
import type { Collection } from "@repo/db/indexer/schema";
import { collections } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { eq, ne } from "drizzle-orm";
import { ofetch } from "ofetch";

import { redis } from "@/lib/redis";
import { uploadWebp, s3Url } from "@/lib/s3";

const BATCH_SIZE = 5;

function isWebp(buf: ArrayBuffer) {
  const u8 = new Uint8Array(buf);
  return u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46;
}

function replaceUrlSize(url: string, size: string) {
  return url.replace(/(4x|3x|2x|thumbnail|original)$/i, size);
}

async function convertToWebp(buf: ArrayBuffer) {
  if (isWebp(buf)) {
    console.log("[process-images] Source is already WebP, skipping re-encode");
    return Buffer.from(buf);
  }
  return await new Bun.Image(Buffer.from(buf)).webp({ quality: 80 }).toBuffer();
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

async function processOne(c: Collection) {
  try {
    const slug = c.slug;

    const images = await Promise.all([
      ofetch(replaceUrlSize(c.frontImage, "original"), { responseType: "arrayBuffer" }).then(
        (buf) => ({ key: `${slug}/front.webp`, buf }),
      ),
      ofetch(replaceUrlSize(c.frontImage, "2x"), { responseType: "arrayBuffer" }).then((buf) => ({
        key: `${slug}/thumbnail.webp`,
        buf,
      })),
      ...(c.backImage
        ? [
            ofetch(replaceUrlSize(c.backImage, "original"), {
              responseType: "arrayBuffer",
            }).then((buf) => ({ key: `${slug}/back.webp`, buf })),
          ]
        : []),
    ]);

    await Promise.all(
      images.map(async ({ key, buf }) => {
        const webp = await convertToWebp(buf);
        await uploadWebp(key, webp);
      }),
    );

    const hash = computeHash(c.thumbnailImage, c.frontImage, c.backImage);

    await indexer
      .update(collections)
      .set({
        processedFrontImage: s3Url(`${slug}/front.webp`),
        processedThumbnailImage: s3Url(`${slug}/thumbnail.webp`),
        ...(c.backImage ? { processedBackImage: s3Url(`${slug}/back.webp`) } : {}),
        imageSyncHash: hash,
      })
      .where(eq(collections.slug, slug));

    await redis.set("collection:modified-at", new Date().toISOString());

    console.log(`[process-images] Processed ${slug}`);
  } catch (err) {
    console.error(`[process-images] Failed for ${c.slug}:`, err);
  }
}
