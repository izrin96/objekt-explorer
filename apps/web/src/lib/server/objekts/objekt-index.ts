import { getTableColumns } from "drizzle-orm";
import { collections } from "../db/indexer/schema";

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
