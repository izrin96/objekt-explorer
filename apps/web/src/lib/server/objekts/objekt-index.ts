import { collections } from "@repo/db/indexer/schema";
import { getTableColumns } from "drizzle-orm";

export function getCollectionColumns() {
  const {
    contract: _contract,
    comoAmount: _comoAmount,
    accentColor: _accentColor,
    thumbnailImage: _thumbnailImage,
    ...rest
  } = getTableColumns(collections);
  return rest;
}
