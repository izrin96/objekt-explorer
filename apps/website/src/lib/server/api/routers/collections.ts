import { fetchCollectionRarity } from "@/lib/server/rarity.server";

import { pub } from "../orpc";

export const collectionsRouter = {
  rarity: pub.handler(() => {
    return fetchCollectionRarity();
  }),
};
