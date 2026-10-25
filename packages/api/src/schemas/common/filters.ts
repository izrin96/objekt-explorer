import { validOnlineTypes } from "@repo/cosmo/types/common";
import * as z from "zod";

import { artistsArraySchema } from "./artist";
import { queryArray } from "./query";

export const collectionFiltersSchema = z.object({
  artist: artistsArraySchema.default([]),
  member: queryArray(z.string()).default([]),
  season: queryArray(z.string()).default([]),
  class: queryArray(z.string()).default([]),
  on_offline: queryArray(z.enum(validOnlineTypes)).default([]),
  collection: queryArray(z.string()).default([]),
});
export type CollectionFilters = z.infer<typeof collectionFiltersSchema>;
