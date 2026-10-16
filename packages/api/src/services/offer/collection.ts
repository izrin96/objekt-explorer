import { collectionAskAllowed } from "../../lib/offer-rules";
import { type GetItemInput } from "../../schemas/offer";
import { type CollectionAddresses, fetchCopies, fetchObjekts } from "./core";

/**
 * The get items that may not be asked for from the partner's collection: held only at a private
 * address, a specific objekt at one that hides serials, any copy at one that shows them, or not
 * held at all.
 */
export async function refusedCollectionAsks(items: GetItemInput[], addresses: CollectionAddresses) {
  const specific = items.filter((item) => item.objektId !== undefined);
  const anyCopy = items.filter((item) => item.objektId === undefined);
  const [found, copies] = await Promise.all([
    fetchObjekts(specific.map((item) => item.objektId!)),
    fetchCopies(
      anyCopy.map((item) => item.collectionSlug),
      [...addresses.shown.keys()],
    ),
  ]);
  return items.filter((item) => {
    if (item.objektId !== undefined) {
      const objekt = found.get(item.objektId);
      const at = objekt?.slug === item.collectionSlug ? addresses.shown.get(objekt.owner) : null;
      return !collectionAskAllowed(true, at ? [at] : []);
    }
    const held = copies
      .filter((copy) => copy.slug === item.collectionSlug)
      .flatMap((copy) => addresses.shown.get(copy.owner) ?? []);
    return !collectionAskAllowed(false, held);
  });
}
