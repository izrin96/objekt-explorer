import type { Transfer } from "../server/db/indexer/schema";
import type { OwnedObjekt } from "./objekts";

export type AggregatedTransfer = {
  transfer: Transfer;
  objekt: OwnedObjekt;
  fromNickname?: string;
  toNickname?: string;
};

export type TransferResult = {
  results: AggregatedTransfer[];
  count: number;
  hasNext: boolean;
  nextStartAfter?: number;
};
