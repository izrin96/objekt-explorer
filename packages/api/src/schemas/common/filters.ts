import { validOnlineTypes } from "@repo/cosmo/types/common";
import * as z from "zod";

import { artistsArraySchema } from "./artist";
import { queryArray } from "./query";

// well above every real choice (about 300 members, 240 collection numbers), and far below
// Postgres's 65,535 bind parameters
const filterValues = () => queryArray(z.string().max(64)).pipe(z.array(z.string()).max(500));

export const collectionFiltersSchema = z.object({
  artist: artistsArraySchema.default([]),
  member: filterValues().default([]),
  season: filterValues().default([]),
  class: filterValues().default([]),
  on_offline: queryArray(z.enum(validOnlineTypes)).default([]),
  collection: filterValues().default([]),
});
export type CollectionFilters = z.infer<typeof collectionFiltersSchema>;
