import { getTableColumns } from "drizzle-orm";
import { collections } from "../db/indexer/schema";

export function getCollectionColumns() {
  // biome-ignore lint/correctness/noUnusedVariables: false
  const { contract, comoAmount, accentColor, thumbnailImage, ...rest } =
    getTableColumns(collections);
  return rest;
}
