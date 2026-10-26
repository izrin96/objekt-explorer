import { earlySend, type HeldItem, type SeenTransfer } from "@repo/api/lib/offer-rules";

export type SentItem = HeldItem & { itemId: number; offerId: number; marked: boolean };

/**
 * Which items of open offers gain or lose their "already sent" mark this run: marked while
 * `earlySend` finds the giver's send, cleared once it no longer does (the objekt went back).
 * Offers this run cancels are left alone.
 */
export function sentChanges(
  items: SentItem[],
  ownerOf: Map<string, string>,
  transfers: SeenTransfer[],
  cancelling: Set<number>,
) {
  const mark: { itemId: number; offerId: number; at: string }[] = [];
  const clear: { itemId: number; offerId: number }[] = [];
  for (const item of items) {
    if (cancelling.has(item.offerId)) continue;
    const send = earlySend(item, ownerOf.get(item.objektId), transfers);
    if (send !== null && !item.marked) {
      mark.push({ itemId: item.itemId, offerId: item.offerId, at: send.timestamp });
    } else if (send === null && item.marked) {
      clear.push({ itemId: item.itemId, offerId: item.offerId });
    }
  }
  return { mark, clear };
}
