import { COLLECTION_MODIFIED_AT_KEY, nextModifiedAt } from "@repo/api/lib/collection-bump";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionMedia } from "@repo/db/schema";
import { chunk } from "@repo/lib";
import { planMediaWrite, type MediaRow } from "@repo/lib/collection-media";
import { spinHeldKey } from "@repo/lib/held-by-key";
import { findPgError } from "@repo/lib/pg-error";
import { lockMediaRow, writeMediaSet } from "@repo/lib/server/collection-media";
import { inArray } from "drizzle-orm";

import { errorCode } from "@/lib/error-code";
import { currentCopy, MEDIA_PREFIX } from "@/lib/media-copy";
import { redis } from "@/lib/redis";
import { objectUrl } from "@/lib/s3";

import { iso, mediaLog } from "./run";

const BACK_IMAGES_PER_RUN = 50;
const APPLY_CHUNK = 500;

type Columns = Record<
  "frontMedia" | "hasAudio" | "backImage" | "accentColor" | "textColor",
  number
>;

/**
 * Writes every record onto the indexer, one transaction per changed slug (Decision 8). The
 * copy prefix keeps the library env-free; `S3_PUBLIC_URL` unset means no copy can match, so
 * `front_media` is simply never written.
 */
export async function applyPhase() {
  const columns: Columns = {
    frontMedia: 0,
    hasAudio: 0,
    backImage: 0,
    accentColor: 0,
    textColor: 0,
  };
  const result = { rows: 0, failed: 0, lockTimeouts: 0, columns };
  const copyPrefix = objectUrl(MEDIA_PREFIX);

  const records = await db
    .select({
      slug: collectionMedia.slug,
      frontMediaCopy: collectionMedia.frontMediaCopy,
      bandImageUrl: collectionMedia.bandImageUrl,
      frontMedia: collectionMedia.frontMedia,
      hasVoice: collectionMedia.hasVoice,
      backImage: collectionMedia.backImage,
      accentColor: collectionMedia.accentColor,
      textColor: collectionMedia.textColor,
    })
    .from(collectionMedia);
  if (records.length === 0) return result;
  // a copy of an earlier source must not be applied: planMediaWrite trusts the copy it is given
  const bySlug = new Map(
    records.map((r) => [r.slug, { ...r, frontMediaCopy: currentCopy(r, copyPrefix) }]),
  );

  let backImageBudget = BACK_IMAGES_PER_RUN;
  await chunk([...bySlug.keys()], APPLY_CHUNK, async (slugs) => {
    const rows = await indexer
      .select({
        slug: collections.slug,
        frontMedia: collections.frontMedia,
        bandImageUrl: collections.bandImageUrl,
        hasAudio: collections.hasAudio,
        backImage: collections.backImage,
        accentColor: collections.accentColor,
        textColor: collections.textColor,
        sourceTextColor: collections.sourceTextColor,
      })
      .from(collections)
      .where(inArray(collections.slug, slugs));

    for (const { slug, ...row } of rows) {
      const record = bySlug.get(slug);
      if (!record) continue;
      // a cheap read-only plan first: only a row with something to write takes a lock
      if (Object.keys(planMediaWrite(row, record, backImageBudget, copyPrefix).set).length === 0) {
        continue;
      }
      try {
        const written = await indexer.transaction(async (tx) => {
          const locked: MediaRow | undefined = await lockMediaRow(tx, slug);
          if (!locked) return null;
          const plan = planMediaWrite(locked, record, backImageBudget, copyPrefix);
          await writeMediaSet(tx, slug, plan.set);
          return plan;
        });
        if (!written || Object.keys(written.set).length === 0) continue;
        backImageBudget = written.backImageBudget;
        result.rows += 1;
        for (const name of Object.keys(written.set) as (keyof Columns)[]) columns[name] += 1;
      } catch (error) {
        // 55P03: an indexer batch holds the row; the next run retries it
        if (findPgError(error, (e) => e.code === "55P03")) result.lockTimeouts += 1;
        else {
          result.failed += 1;
          mediaLog.debug(`Apply failed for ${slug}: ${errorCode(error)}`);
        }
      }
    }
  });

  if (result.rows > 0) await bumpCaches();
  return result;
}

/** After any write: the list reads as changed, and Spin's cached held list (it carries media) goes. */
export async function bumpCaches() {
  try {
    const next = iso(nextModifiedAt(Date.now(), await redis.get(COLLECTION_MODIFIED_AT_KEY)));
    await redis.set(COLLECTION_MODIFIED_AT_KEY, next);
    await redis.del(spinHeldKey());
  } catch (error) {
    mediaLog.warn("Could not bump the collection list; browsers see the change on the next bump");
    mediaLog.debug(`Bump failed: ${errorCode(error)}`);
  }
}
