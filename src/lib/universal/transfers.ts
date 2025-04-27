import { z } from "zod";
import type { Transfer } from "../server/db/indexer/schema";
import type { OwnedObjekt } from "./objekts";
import {
  validArtists,
  validClasses,
  validOnlineTypes,
  validSeasons,
} from "./cosmo/common";

export type AggregatedTransfer = {
  transfer: Transfer;
  objekt: OwnedObjekt;
  fromNickname?: string;
  toNickname?: string;
};

export type TransferResult = {
  results: AggregatedTransfer[];
  nextStartAfter?: number;
};

export const validType = ["all", "mint", "received", "sent", "spin"] as const;
export type ValidType = (typeof validType)[number];

export const transfersSchema = z.object({
  page: z.coerce.number().default(0),
  type: z.enum(validType).default("all"),
  artist: z.enum(validArtists).array(),
  member: z.string().array(),
  season: z.enum(validSeasons).array(),
  class: z.enum(validClasses).array(),
  on_offline: z.enum(validOnlineTypes).array(),
});

export type TransferParams = z.infer<typeof transfersSchema>;
