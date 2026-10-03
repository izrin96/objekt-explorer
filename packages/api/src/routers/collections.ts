import { optionalAuthed, pub } from "../orpc";
import { holdersInputSchema } from "../schemas/objekt";
import { fetchHolders } from "../services/holders";
import { fetchCollectionRarity } from "../services/rarity";

export const collectionsRouter = {
  rarity: pub.handler(() => {
    return fetchCollectionRarity();
  }),

  holders: optionalAuthed
    .input(holdersInputSchema)
    .handler(({ input, context: { session } }) => fetchHolders(input, session?.user.id)),
};
