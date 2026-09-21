import { pub } from "../orpc";
import { fetchCollectionRarity } from "../services/rarity";

export const collectionsRouter = {
  rarity: pub.handler(() => {
    return fetchCollectionRarity();
  }),
};
