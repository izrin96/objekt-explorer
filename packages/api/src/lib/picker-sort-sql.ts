import { type SQL, sql } from "drizzle-orm";

import type { CandidateCursor } from "../schemas/offer";

type Cols = { no: SQL; rank: SQL; received: SQL; slug: SQL };

/**
 * One list for the window and the final `ORDER BY`, so they cannot drift from the cursor test.
 * `"C"` pins code-unit order, which equals the grid's on `[0-9]+[A-Z]` whatever the database collates by.
 */
export const collectionNoOrder = ({ no, rank, received, slug }: Cols) =>
  sql`${no} COLLATE "C" ASC, ${rank} ASC, ${received} DESC, ${slug} DESC`;

/** The groups after `cursor`; the directions are mixed, so it is spelled out rather than a row comparison. */
export const collectionNoAfter = (
  { no, rank, received, slug }: Cols,
  cursor: Extract<CandidateCursor, { sort: "collectionNo" }>,
) =>
  sql`(${no} COLLATE "C" > ${cursor.no}::text OR (${no} COLLATE "C" = ${cursor.no}::text AND (${rank} > ${cursor.rank}::int OR (${rank} = ${cursor.rank}::int AND (${received}, ${slug}) < (${cursor.receivedAt}::timestamptz, ${cursor.slug}::text)))))`;
