import { fetchCollectionRarity } from "@/lib/server/rarity";

import { pub } from "../orpc";

export const collectionsRouter = {
  rarity: pub.handler(() => {
    return fetchCollectionRarity();
  }),
};
