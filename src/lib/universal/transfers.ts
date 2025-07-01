import { z } from "zod/v4";
import type { Transfer } from "../server/db/indexer/schema";
import { validArtists, validClasses, validOnlineTypes, validSeasons } from "./cosmo/common";
import type { OwnedObjekt } from "./objekts";

export type AggregatedTransfer = {
  transfer: Pick<Transfer, "id" | "from" | "to" | "timestamp">;
  objekt: OwnedObjekt;
  nickname: {
    from: string | undefined;
    to: string | undefined;
  };
};

export type TransferResult = {
  hide?: boolean | undefined;
  results: AggregatedTransfer[];
  nextCursor?: {
    timestamp: string;
    id: string;
  };
};

export const validType = ["all", "mint", "received", "sent", "spin"] as const;
export type ValidType = (typeof validType)[number];

export const transfersSchema = z.object({
  type: z.enum(validType).default("all"),
  artist: z.enum(validArtists).array(),
  member: z.string().array(),
  season: z.enum(validSeasons).array(),
  class: z.enum(validClasses).array(),
  on_offline: z.enum(validOnlineTypes).array(),
  collection: z.string().array(),
});

export type TransferParams = z.infer<typeof transfersSchema>;
