import { collections } from "@repo/db/indexer/schema";
import { getColumns } from "drizzle-orm";

export function getCollectionColumns() {
  const {
    contract: _contract,
    comoAmount: _comoAmount,
    accentColor: _accentColor,
    thumbnailImage: _thumbnailImage,
    ...rest
  } = getColumns(collections);
  return rest;
}
