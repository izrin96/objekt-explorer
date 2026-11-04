import type { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { eq, sql } from "drizzle-orm";

import type { ColourRow, ColourSet } from "../collection-colours";

export type IndexerTx = Parameters<Parameters<typeof indexer.transaction>[0]>[0];

export const colourColumns = {
  textColor: collections.textColor,
  backgroundColor: collections.backgroundColor,
  sourceTextColor: collections.sourceTextColor,
  sourceBackgroundColor: collections.sourceBackgroundColor,
};

/**
 * Locks a collection's row for a colour write and reads its colours; undefined when no collection
 * has the slug. A save waits at most 5 s behind an indexer batch holding the row, then fails.
 */
export async function lockColourRow(tx: IndexerTx, slug: string): Promise<ColourRow | undefined> {
  // SET LOCAL, so the timeout ends with the transaction and never leaks through pgbouncer
  await tx.execute(sql`SET LOCAL lock_timeout = '5s'`);
  const [row] = await tx
    .select(colourColumns)
    .from(collections)
    .where(eq(collections.slug, slug))
    .for("update");
  return row;
}

/** Writes a planned set to a row locked by `lockColourRow`, touching only the colour columns. */
export async function writeColourSet(tx: IndexerTx, slug: string, set: ColourSet) {
  if (Object.keys(set).length === 0) return;
  await tx
    .update(collections)
    .set({
      textColor: set.textColor,
      backgroundColor: set.backgroundColor,
      sourceTextColor: set.sourceTextColor,
      sourceBackgroundColor: set.sourceBackgroundColor,
    })
    .where(eq(collections.slug, slug));
}
