import { z } from "zod/v4";
import type { Transfer } from "../server/db/indexer/schema";
import type { UserAddress } from "../server/db/schema";
import { validArtists, validClasses, validOnlineTypes, validSeasons } from "./cosmo/common";
import type { OwnedObjekt } from "./objekts";

export type ActivityData = {
  transfer: Transfer;
  objekt: OwnedObjekt;
  user: {
    from: Pick<UserAddress, "address" | "nickname"> | undefined;
    to: Pick<UserAddress, "address" | "nickname"> | undefined;
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
