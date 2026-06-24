import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { S3Client } from "bun";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY;
const secretAccessKey = process.env.S3_SECRET_KEY;
const region = process.env.S3_REGION ?? "auto";
const bucket = process.env.S3_BUCKET ?? "";
const FOLDER = "collection-images";

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

  const activeUrls = new Set<string>();
  for (const c of cols) {
    if (c.processedFrontImage) activeUrls.add(c.processedFrontImage);
    if (c.processedThumbnailImage) activeUrls.add(c.processedThumbnailImage);
    if (c.processedBackImage) activeUrls.add(c.processedBackImage);
  }

  const publicUrl = process.env.S3_PUBLIC_URL ?? endpoint;

  const orphaned = allKeys.filter((key) => !activeUrls.has(`${publicUrl}/${key}`));

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
