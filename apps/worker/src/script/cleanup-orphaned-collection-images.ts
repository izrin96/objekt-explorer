import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { S3Client } from "bun";

import { FOLDER, keyFromUrl } from "../lib/s3";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const region = process.env.S3_REGION ?? "auto";
const bucket = process.env.S3_BUCKET ?? "";

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("[cleanup] Missing S3_ENDPOINT / S3_ACCESS_KEY / S3_SECRET_KEY / S3_BUCKET");
  process.exit(1);
}

const s3Config = { accessKeyId, secretAccessKey, endpoint, region };

async function cleanupOrphanedCollectionImages() {
  console.log("[cleanup] Listing objects in collection-images...");

  const allKeys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const listResult = await S3Client.list(
      { prefix: `${FOLDER}/`, continuationToken },
      { ...s3Config, bucket },
    );

    if (listResult?.contents) {
      for (const obj of listResult.contents) {
        allKeys.push(obj.key);
      }
    }

    continuationToken = listResult?.nextContinuationToken;
  } while (continuationToken);

  console.log(`[cleanup] Found ${allKeys.length} total objects`);

  const cols = await indexer
    .select({
      processedFrontImage: collections.processedFrontImage,
      processedThumbnailImage: collections.processedThumbnailImage,
      processedBackImage: collections.processedBackImage,
    })
    .from(collections);

  const activeKeys = new Set<string>();
  const foreignUrls: string[] = [];
  for (const c of cols) {
    for (const url of [c.processedFrontImage, c.processedThumbnailImage, c.processedBackImage]) {
      if (!url) continue;
      const key = keyFromUrl(url);
      if (key) activeKeys.add(key);
      else foreignUrls.push(url);
    }
  }

  // a stored URL outside S3_PUBLIC_URL means the env and the data disagree, and
  // every object it points at would look orphaned
  if (foreignUrls.length > 0) {
    console.error(
      `[cleanup] ${foreignUrls.length} stored URLs are not under S3_PUBLIC_URL, e.g. ${foreignUrls[0]} — refusing to delete`,
    );
    process.exit(1);
  }

  const orphaned = allKeys.filter((key) => !activeKeys.has(key));

  if (orphaned.length === 0) {
    console.log("[cleanup] No orphaned objects to clean up");
    return;
  }

  console.log(`[cleanup] ${orphaned.length} orphaned objects to delete:`);
  for (const key of orphaned) {
    console.log(`  ${key}`);
  }

  let deleted = 0;
  for (const key of orphaned) {
    await S3Client.delete(key, { ...s3Config, bucket });
    deleted++;
  }

  console.log(`[cleanup] Deleted ${deleted} orphaned objects`);
}

await cleanupOrphanedCollectionImages();
