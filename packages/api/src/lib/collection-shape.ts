import type { IndexedObjekt } from "@repo/lib/types/objekt";

import type {
  CollectionListInput,
  CollectionListOutput,
  SlimCollectionListOutput,
} from "../schemas/collections";

export type ListShape = Pick<CollectionListInput, "originals" | "ids">;
export type ShapedList = CollectionListOutput | SlimCollectionListOutput;

/**
 * The rows with the fields `shape` leaves out dropped in place, so each row must be the caller's
 * own copy: a fresh query's, or a copy of the cached full list's.
 */
export function shapeRows(rows: IndexedObjekt[], { originals, ids }: ListShape): ShapedList {
  for (const row of rows) {
    if (!originals) {
      delete row.originalFrontImage;
      delete row.originalBackImage;
    }
  }
  if (ids) return { collections: rows };
  return {
    collections: rows.map((row): Omit<IndexedObjekt, "id"> => {
      delete (row as Partial<IndexedObjekt>).id;
      return row;
    }),
  };
}
