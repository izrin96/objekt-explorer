import { validOnlineTypes } from "@repo/cosmo/types/common";
import * as z from "zod";

import { artistDescription, artistsArraySchema } from "./artist";
import { queryArray } from "./query";

// well above every real choice (about 300 members, 240 collection numbers), and far below
// Postgres's 65,535 bind parameters
const filterValues = () => queryArray(z.string().max(64)).pipe(z.array(z.string()).max(500));

export const collectionFiltersSchema = z.object({
  artist: artistsArraySchema.default([]).meta({ description: artistDescription }),
  member: filterValues().default([]).meta({ description: "Member names; repeat the key for more" }),
  season: filterValues()
    .default([])
    .meta({ description: "Seasons, such as `Atom01`; repeat the key for more" }),
  class: filterValues()
    .default([])
    .meta({ description: "Classes, such as `First` or `Special`; repeat the key for more" }),
  on_offline: queryArray(z.enum(validOnlineTypes))
    .default([])
    .meta({ description: "`online` or `offline` (physical) objekts; repeat the key for both" }),
  collection: filterValues()
    .default([])
    .meta({ description: "Collection numbers, such as `101Z`; repeat the key for more" }),
});
export type CollectionFilters = z.infer<typeof collectionFiltersSchema>;
