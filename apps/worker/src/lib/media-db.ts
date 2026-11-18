import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { chunk } from "@repo/lib";
import { inArray, sql } from "drizzle-orm";

const SLUG_CHUNK = 500;

/** A timestamp column as epoch milliseconds, since the driver's timestamptz strings are not a format `Date` promises to read. */
export const epochMs = (column: unknown) =>
  sql<number>`(extract(epoch from ${column}) * 1000)::float8`;

/** Which of `slugs` the indexer has as collections; a failed read throws. */
export async function indexedSlugs(slugs: string[]) {
  const found = new Set<string>();
  await chunk(slugs, SLUG_CHUNK, async (part) => {
    const rows = await indexer
      .select({ slug: collections.slug })
      .from(collections)
      .where(inArray(collections.slug, part));
    for (const row of rows) found.add(row.slug);
  });
  return found;
}
