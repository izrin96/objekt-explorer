import { collectionAskAllowed } from "../../lib/offer-rules";
import { type GetItemInput } from "../../schemas/offer";
import { fetchObjekts } from "./core";

/** The get items that may not be asked for from the partner's collection (see `collectionAskAllowed`). */
export async function refusedCollectionAsks(items: GetItemInput[], addresses: readonly string[]) {
  const held = new Set(addresses);
  const found = await fetchObjekts(items.flatMap((item) => item.objektId ?? []));
  return items.filter(
    (item) =>
      !collectionAskAllowed(
        item,
        item.objektId === undefined ? undefined : found.get(item.objektId),
        held,
      ),
  );
}
