import { db } from "@repo/db";
import { listEntries } from "@repo/db/schema";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { inArray } from "drizzle-orm";

import {
  type EntryAsk,
  fullSide,
  listMatchesOf,
  narrowViewer,
  stackAsk,
} from "../../../lib/trade-feed";
import { type SideItemsInput } from "../../../schemas/trade";
import { fetchCollectionsBySlug } from "../../list/collections";
import { resolveCompareSides } from "../matches";
import { findTradeList, tradeEntriesOf } from "./shared";
import { fetchViewer } from "./viewer";

/**
 * A page of one side of a post on Trade, from `cursor`, ringed against the viewer as the feed rings
 * it: by Compare with's lists when `list` is given, and not at all on the owner's own list. A sale
 * page carries what each stack asks. Not found when the list is gone, off Trade, or hidden from
 * the viewer.
 */
export async function fetchSideItems(viewerId: string | null, input: SideItemsInput) {
  const list = await findTradeList(viewerId, input.listId);
  const ringing = viewerId !== null && viewerId !== list.userId;
  const [entries, viewer, sides] = await Promise.all([
    tradeEntriesOf(list),
    ringing ? fetchViewer(viewerId) : null,
    ringing && input.list ? resolveCompareSides(viewerId, input.list, input.mutual ?? false) : null,
  ]);
  const offset = input.cursor ?? 0;
  const { copyIds, ...side } = fullSide(
    list.listType,
    list,
    entries,
    viewer && sides ? narrowViewer(viewer, sides) : viewer,
    { offset },
  );
  const [collectionRows, asks] = await Promise.all([
    fetchCollectionsBySlug(
      side.items.map((item) => item.slug),
      [],
    ),
    list.listType === "sale" ? fetchAsks(copyIds.flat()) : null,
  ]);
  return {
    ...side,
    items: asks
      ? side.items.map((item, i) => ({
          ...item,
          ...stackAsk((copyIds[i] ?? []).flatMap((id) => asks.get(id) ?? [])),
        }))
      : side.items,
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}

/** The price, QYOP flag and note of each sale entry, by id. */
async function fetchAsks(ids: readonly number[]) {
  if (ids.length === 0) return new Map<number, EntryAsk>();
  const rows = await db
    .select({
      id: listEntries.id,
      price: listEntries.price,
      isQyop: listEntries.isQyop,
      note: listEntries.note,
    })
    .from(listEntries)
    .where(inArray(listEntries.id, [...ids]));
  return new Map(rows.map((row) => [row.id, row]));
}

/** Which of a list's collections match the viewer's lists, and which of theirs: none on their own. */
export async function fetchListMatches(viewerId: string, listId: number) {
  const list = await findTradeList(viewerId, listId);
  if (list.userId === viewerId) return { slugs: [], listIds: [], near: null };
  const [entries, viewer] = await Promise.all([tradeEntriesOf(list), fetchViewer(viewerId)]);
  return listMatchesOf(list.listType, list, entries, viewer);
}

/**
 * Market's Show my matches: the collections on the viewer's want lists that a listing answers,
 * those open to buying, as a sale list rings them, with the lists each is on.
 */
export async function fetchMarketMatches(viewerId: string) {
  const viewer = await fetchViewer(viewerId);
  return { want: Object.fromEntries(viewer.saleWant) as Record<string, number[]> };
}

/** A profile's Show my matches: what any of the viewer's want lists hold, whatever its Open to. */
export async function fetchProfileMatches(viewerId: string) {
  const viewer = await fetchViewer(viewerId);
  return { want: Object.fromEntries(viewer.want) as Record<string, number[]> };
}
