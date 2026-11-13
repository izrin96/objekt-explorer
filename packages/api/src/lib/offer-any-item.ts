import { type ListEntryRef, entryObjektId } from "./offer-rules";

/**
 * The entry an any item stands on: the first that lists the collection as any copy, else the
 * first, since a prefill through a list that only names copies must not take Any serial.
 */
export function anyEntryOf<E extends ListEntryRef>(entries: readonly E[]): E | undefined {
  return entries.find((entry) => entryObjektId(entry) === null) ?? entries[0];
}

type ShownCopy = { id: string; transferable: boolean; reserved: boolean; inScope: boolean };

/**
 * The any item of one collection, or null when no copy is left to ask for. `hidden` is
 * `max(0, copies - in-scope shown copies that are transferable and unreserved)`: the copies only
 * Any serial reaches. `spareIds` are the held copies in scope that are transferable and
 * unreserved; a copy named twice counts once.
 */
export function anyCopyItem(input: {
  entries: readonly ListEntryRef[];
  spareIds: readonly string[];
  shown: readonly ShownCopy[];
  /** open any-copy legs the partner already owes in this collection */
  promised: number;
}) {
  const source = anyEntryOf(input.entries);
  const copies = new Set(input.spareIds).size - input.promised;
  if (!source || copies <= 0) return null;
  const standing = new Set(
    input.shown.flatMap((c) => (c.inScope && c.transferable && !c.reserved ? [c.id] : [])),
  );
  return { copies, hidden: Math.max(0, copies - standing.size), listSlug: source.listSlug };
}
