import type { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { eq, sql } from "drizzle-orm";

import type { MediaRow, MediaWrite } from "../collection-media";

type IndexerTx = Parameters<Parameters<typeof indexer.transaction>[0]>[0];

const mediaColumns = {
  frontMedia: collections.frontMedia,
  bandImageUrl: collections.bandImageUrl,
  hasAudio: collections.hasAudio,
  backImage: collections.backImage,
  accentColor: collections.accentColor,
  textColor: collections.textColor,
  sourceTextColor: collections.sourceTextColor,
};

/**
 * Locks a collection's row for a media write and reads the columns the plan looks at; undefined
 * when no collection has the slug. A write waits at most 5 s behind an indexer batch holding the
 * row, then fails (the caller skips the row and the next run retries it).
 */
export async function lockMediaRow(tx: IndexerTx, slug: string): Promise<MediaRow | undefined> {
  // SET LOCAL, so the timeout ends with the transaction and never leaks through pgbouncer
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  const [row] = await tx
    .select(mediaColumns)
    .from(collections)
    .where(eq(collections.slug, slug))
    .for("update");
  return row;
}

/**
 * Writes a planned set to a row locked by `lockMediaRow`. Only the columns in the set are
 * updated: `band_image_url`, `source_text_color` and `background_color` are not even nameable.
 */
export async function writeMediaSet(tx: IndexerTx, slug: string, set: MediaWrite) {
  const values: Partial<typeof collections.$inferInsert> = {};
  if (set.frontMedia !== undefined) values.frontMedia = set.frontMedia;
  if (set.hasAudio !== undefined) values.hasAudio = set.hasAudio;
  if (set.backImage !== undefined) values.backImage = set.backImage;
  if (set.accentColor !== undefined) values.accentColor = set.accentColor;
  if (set.textColor !== undefined) values.textColor = set.textColor;
  if (Object.keys(values).length === 0) return;
  await tx.update(collections).set(values).where(eq(collections.slug, slug));
}
