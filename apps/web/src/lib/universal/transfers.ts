import type { Transfer } from "../server/db/indexer/schema";
import type { OwnedObjekt } from "./objekts";

export type AggregatedTransfer = {
  transfer: Pick<Transfer, "id" | "from" | "to" | "timestamp">;
  objekt: OwnedObjekt;
  nickname: {
    from?: string | null;
    to?: string | null;
  };
};

export type TransferResult = {
  hide?: boolean | undefined;
  results: AggregatedTransfer[];
  nextCursor?: {
    id: string;
  };
};

export const validType = ["all", "mint", "received", "sent", "spin"] as const;
export type ValidType = (typeof validType)[number];
