import { getTableColumns } from "drizzle-orm";
import { collections } from "../db/indexer/schema";

export function getCollectionColumns() {
  const { contract, comoAmount, accentColor, thumbnailImage, ...rest } =
    getTableColumns(collections);
  return rest;
}
