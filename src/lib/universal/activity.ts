import { z } from "zod/v4";
import type { Transfer } from "../server/db/indexer/schema";
import { validArtists, validClasses, validOnlineTypes, validSeasons } from "./cosmo/common";
import type { OwnedObjekt } from "./objekts";

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
  nextCursor: z.infer<typeof cursorSchema>;
};

const cursorSchema = z
  .object({
    timestamp: z.string(),
    id: z.string(),
  })
  .optional();

export const validType = ["all", "mint", "transfer", "spin"] as const;
export type ValidType = (typeof validType)[number];

export const activitySchema = z.object({
  type: z.enum(validType).default("all"),
  artist: z.enum(validArtists).array(),
  member: z.string().array(),
  season: z.enum(validSeasons).array(),
  class: z.enum(validClasses).array(),
  on_offline: z.enum(validOnlineTypes).array(),
  collection: z.string().array(),
});

export type ActivityParams = z.infer<typeof activitySchema>;
