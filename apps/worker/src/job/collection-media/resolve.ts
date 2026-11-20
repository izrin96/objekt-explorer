import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { collectionMedia, modAudit } from "@repo/db/schema";
import { planCosmoResolve } from "@repo/lib/collection-colours";
import { findPgError } from "@repo/lib/pg-error";
import { colourColumns, lockColourRow, writeColourSet } from "@repo/lib/server/collection-colours";
import { and, inArray, isNotNull, or } from "drizzle-orm";

import { errorCode } from "@/lib/error-code";

import { bumpCaches } from "./apply";
import { mediaLog } from "./run";

/**
 * Drops each unpinned staff colour that Cosmo's colour now equals (`planCosmoResolve`): the
 * recorded text colour, or the source's background. A colour that differs is left for staff on
 * Differs from Cosmo. Each drop writes its `collection_override` entry, naming Cosmo, and commits
 * it before the indexer, as a staff save does, so no colour changes without history.
 */
export async function resolveStep() {
  const result = { rows: 0, text: 0, background: 0, failed: 0, lockTimeouts: 0 };
  const rows = await indexer
    .select({ slug: collections.slug, ...colourColumns })
    .from(collections)
    .where(
      or(isNotNull(collections.sourceTextColor), isNotNull(collections.sourceBackgroundColor)),
    );
  if (rows.length === 0) return result;
  const recorded = new Map(
    (
      await db
        .select({ slug: collectionMedia.slug, textColor: collectionMedia.textColor })
        .from(collectionMedia)
        .where(
          and(
            inArray(
              collectionMedia.slug,
              rows.map((row) => row.slug),
            ),
            isNotNull(collectionMedia.textColor),
          ),
        )
    ).map((row) => [row.slug, row.textColor]),
  );

  for (const { slug, ...row } of rows) {
    const text = recorded.get(slug) ?? null;
    // a read-only plan first: only a row with a drop takes a lock
    if (!planCosmoResolve(row, text)) continue;
    try {
      const done = await indexer.transaction(async (tx) => {
        const locked = await lockColourRow(tx, slug);
        if (!locked) return null;
        const plan = planCosmoResolve(locked, text);
        if (!plan) return null;
        await db.insert(modAudit).values({
          actorId: null,
          action: "collection_override",
          targetUserId: null,
          reportIds: null,
          detail: { slug, before: plan.before, after: plan.after, shown: plan.shown, by: "cosmo" },
        });
        await writeColourSet(tx, slug, plan.set);
        return plan;
      });
      if (!done) continue;
      result.rows += 1;
      if (done.before.textColor !== null && done.after.textColor === null) result.text += 1;
      if (done.before.backgroundColor !== null && done.after.backgroundColor === null) {
        result.background += 1;
      }
    } catch (error) {
      // 55P03: an indexer batch holds the row; the next run retries it
      if (findPgError(error, (e) => e.code === "55P03")) result.lockTimeouts += 1;
      else {
        result.failed += 1;
        mediaLog.debug(`Resolve failed for ${slug}: ${errorCode(error)}`);
      }
    }
  }

  if (result.rows > 0) await bumpCaches();
  return result;
}
