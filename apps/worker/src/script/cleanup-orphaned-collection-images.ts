// Deletes objects under `collection-images/` and `collection-media/` that no row names. A dry run
// that prints what it would delete, until `APPLY=1`. It skips objects modified in the last 2 hours
// (an upload may not be recorded yet) and refuses, deleting nothing, when `collection-media/` has
// objects but no `collection_media` row names a copy, which means this run reads the wrong app
// database. It runs against the production `.env`: read the dry run before `APPLY=1`.

import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionMedia } from "@repo/db/schema";
import { S3Client } from "bun";

import { planOrphans } from "../lib/orphan-cleanup";
import { FOLDER, keyFromUrl, mediaKeyFromUrl } from "../lib/s3";

const MEDIA_FOLDER = "collection-media";

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
  const apply = process.env.APPLY === "1";
  const objects: { key: string; lastModified: number }[] = [];
  for (const folder of [FOLDER, MEDIA_FOLDER]) {
    console.log(`[cleanup] Listing objects in ${folder}...`);
    let continuationToken: string | undefined;

    do {
      const listResult = await S3Client.list(
        { prefix: `${folder}/`, continuationToken },
        { ...s3Config, bucket },
      );

      if (listResult?.contents) {
        for (const obj of listResult.contents) {
          objects.push({ key: obj.key, lastModified: Date.parse(String(obj.lastModified)) });
        }
      }

      continuationToken = listResult?.nextContinuationToken;
    } while (continuationToken);
  }

  console.log(`[cleanup] Found ${objects.length} total objects`);

  const cols = await indexer
    .select({
      processedFrontImage: collections.processedFrontImage,
      processedThumbnailImage: collections.processedThumbnailImage,
      processedBackImage: collections.processedBackImage,
      frontMedia: collections.frontMedia,
    })
    .from(collections);
  // the apply writes only our copy's URL into `front_media`; the record holds the same copy
  const copies = await db
    .select({ frontMediaCopy: collectionMedia.frontMediaCopy })
    .from(collectionMedia);

  const activeKeys = new Set<string>();
  const rowCopyKeys = new Set<string>();
  const foreignUrls: string[] = [];
  for (const c of cols) {
    for (const url of [c.processedFrontImage, c.processedThumbnailImage, c.processedBackImage]) {
      if (!url) continue;
      const key = keyFromUrl(url);
      if (key) activeKeys.add(key);
      else foreignUrls.push(url);
    }
  }
  const mediaUrls = [
    ...cols.map((c) => ({ url: c.frontMedia, row: false })),
    ...copies.map((c) => ({ url: c.frontMediaCopy, row: true })),
  ];
  for (const { url, row } of mediaUrls) {
    if (!url) continue;
    const key = mediaKeyFromUrl(url);
    if (key) {
      activeKeys.add(key);
      if (row) rowCopyKeys.add(key);
    } else foreignUrls.push(url);
  }

  // a stored URL outside S3_PUBLIC_URL means the env and the data disagree, and
  // every object it points at would look orphaned
  if (foreignUrls.length > 0) {
    console.error(
      `[cleanup] ${foreignUrls.length} stored URLs are not under S3_PUBLIC_URL, e.g. ${foreignUrls[0]} — refusing to delete`,
    );
    process.exit(1);
  }

  const plan = planOrphans({ objects, activeKeys, rowCopyKeys, now: Date.now() });
  if (!plan.ok) {
    console.error(
      "[cleanup] collection-media/ has objects but no collection_media row names a copy: this looks like the wrong app database. Refusing to delete",
    );
    process.exit(1);
  }
  const { orphans, tooNew } = plan;
  if (tooNew > 0)
    console.log(`[cleanup] Skipping ${tooNew} unreferenced objects modified in the last 2 hours`);

  if (orphans.length === 0) {
    console.log("[cleanup] No orphaned objects to clean up");
    return;
  }

  console.log(
    `[cleanup] ${orphans.length} orphaned objects${apply ? " to delete" : " (dry run)"}:`,
  );
  for (const key of orphans) {
    console.log(`  ${key}`);
  }
  if (!apply) {
    console.log("[cleanup] Dry run: nothing deleted. Run with APPLY=1 to delete them");
    return;
  }

  let deleted = 0;
  for (const key of orphans) {
    await S3Client.delete(key, { ...s3Config, bucket });
    deleted++;
  }

  console.log(`[cleanup] Deleted ${deleted} orphaned objects`);
}

await cleanupOrphanedCollectionImages();
