import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { and, eq, sql } from "drizzle-orm";

import { isPostIdle, pairPosts } from "../../../lib/trade-feed";
import { addressesByUser } from "../../../lib/trade-rank";
import type { ListType } from "../../../schemas/list";
import { notBlockedEither, notTradeSanctioned } from "../../moderation/safety";
import { takesPartInTrade } from "../lists";
import { fetchAddresses } from "../matches/holdings";
import { type FeedList, feedListColumns, fetchPostEntries } from "./entries";

export const TRADE_TYPES = ["have", "want", "sale"] as const satisfies ListType[];
export const isTradeType = (type: ListType): type is (typeof TRADE_TYPES)[number] =>
  (TRADE_TYPES as readonly ListType[]).includes(type);

/** A list the viewer may see on Trade: shown there, its owner not trade-sanctioned, no block either way. */
export const visibleOnTrade = (viewerId: string | null) =>
  and(
    eq(lists.discoverable, true),
    takesPartInTrade,
    notTradeSanctioned(sql`${lists.userId}`),
    viewerId === null ? undefined : notBlockedEither(viewerId, sql`${lists.userId}`),
  );

/** A list on Trade the viewer may see: not gone, off Trade, sanctioned or blocked either way. */
export async function findTradeList(viewerId: string | null, listId: number) {
  const [list] = await db
    .select(feedListColumns)
    .from(lists)
    .where(and(eq(lists.id, listId), visibleOnTrade(viewerId)));
  if (!list || !isTradeType(list.listType)) throw new ORPCError("NOT_FOUND");
  return { ...list, listType: list.listType };
}

/** A list's shown entries: have and sale narrowed to what the owner can still trade. */
export async function tradeEntriesOf(list: FeedList) {
  const addressRows = await fetchAddresses([list.userId]);
  const entriesOf = await fetchPostEntries([list], addressesByUser(addressRows));
  return entriesOf.get(list.id) ?? [];
}

/** A person's lists the viewer sees on Trade, in posts still listed: those their strips draw. */
export async function listedTradeLists(viewerId: string, personId: string) {
  const rows = await db
    .select(feedListColumns)
    .from(lists)
    .where(and(eq(lists.userId, personId), visibleOnTrade(viewerId)));
  const now = new Date();
  return pairPosts(rows)
    .filter((post) => !isPostIdle(post, now))
    .flatMap((post) =>
      [post.have, post.sale, post.want].flatMap((list) =>
        list && isTradeType(list.listType) ? [{ ...list, listType: list.listType }] : [],
      ),
    );
}
