import type { Transfer } from "@repo/db/indexer/schema";
import type { OwnedObjekt } from "@repo/lib/objekts";

export type PartialTransfer = Pick<Transfer, "id" | "from" | "to" | "timestamp" | "hash">;

export type ActivityData = {
  transfer: PartialTransfer;
  objekt: OwnedObjekt;
  nickname: {
    from?: string | null;
    to?: string | null;
  };
};

export type ActivityResponse = {
  items: ActivityData[];
  nextCursor?: {
    id: string;
  };
};

export const validType = ["all", "mint", "transfer", "spin"] as const;
export type ValidType = (typeof validType)[number];
