import { db } from "@repo/db";
import { listEntries, lists, tradePost, user } from "@repo/db/schema";
import { type SQL, and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { previewSide } from "../../../lib/trade-feed";
import { DEFAULT_OPEN_TO, sideStateOf } from "../../../lib/trade-post-state";
import { pairPosts, postFromRow, type PostTag } from "../../../lib/trade-posts";
import { addressesByUser, nicknamesByAddress, toPartnerIdentity } from "../../../lib/trade-rank";
import { listPostSql } from "../../../lib/trade-sql";
import { unique } from "../../../lib/unique";
import type { PostCardView } from "../../../schemas/chat";
import { canBeOnTrade } from "../../../schemas/list";
import { tradeHandle } from "../../../schemas/trade-person";
import { fetchAddresses } from "../matches/holdings";
import { type FeedList, feedListColumns, fetchPostEntries, fetchPostRows } from "./entries";
import { visibleOnTrade } from "./shared";

const POST_CARD_LIMIT = 6;

type PostCardPost = NonNullable<PostCardView["post"]>;

/**
 * The post each named list shows now ({@link listPostSql}): its row by the named list's id, and the
 * named lists and the lists of those rows that `listWhere` keeps, all in one round trip. A list in
 * no row has no row.
 */
export async function namedPostsOf(listIds: number[], listWhere?: SQL) {
  const named = alias(lists, "named");
  const rowIds = db
    .select({ id: listPostSql("named") })
    .from(named)
    .where(inArray(named.id, listIds));
  const [namedRows, rowById, members] = await Promise.all([
    db
      .select({ id: named.id, postId: listPostSql("named") })
      .from(named)
      .where(inArray(named.id, listIds)),
    fetchPostRows(inArray(tradePost.id, rowIds)),
    db
      .select(feedListColumns)
      .from(lists)
      .where(
        and(
          or(
            inArray(lists.id, listIds),
            inArray(
              lists.id,
              db
                .select({
                  id: sql<number>`unnest(ARRAY[${tradePost.leadListId}, ${tradePost.wantListId}])`,
                })
                .from(tradePost)
                .where(inArray(tradePost.id, rowIds)),
            ),
          ),
          listWhere,
        ),
      ),
  ]);
  const listById = new Map(members.map((list) => [list.id, list]));
  return {
    rowOf: (id: number) => {
      const postId = namedRows.find((row) => row.id === id)?.postId;
      return postId == null ? undefined : rowById.get(postId);
    },
    listById,
  };
}

/**
 * Posts as a chat card draws them, by the id of the list the card was sent from; a list that is
 * gone, or no longer shown on Trade, maps to null. A card's list is either half of a pair: the
 * post is the one that holds it now ({@link listPostSql}), so a want list later linked to a have
 * list shows that post.
 */
export async function fetchPostCards(
  listIds: number[],
  viewerId: string | null,
): Promise<Map<number, PostCardPost | null>> {
  const result = new Map<number, PostCardPost | null>(listIds.map((id) => [id, null]));
  if (listIds.length === 0) return result;

  const { rowOf, listById } = await namedPostsOf(listIds, visibleOnTrade(viewerId));
  const found = listIds.flatMap((id) => {
    const row = rowOf(id);
    if (!row) return [];
    // a card shows only the sides on Trade, and the post only while the named list's side is
    const side = (listId: number | null, onTrade: boolean) =>
      listId !== null && onTrade ? (listById.get(listId) ?? null) : null;
    const post = postFromRow(
      row,
      side(row.leadListId, row.leadOnTrade),
      side(row.wantListId, row.wantOnTrade),
    ).find((p) => [p.have, p.want, p.sale].some((list) => list?.id === id));
    return post ? [{ id, post }] : [];
  });
  if (found.length === 0) return result;

  const members = found.flatMap(({ post }) =>
    [post.have, post.want, post.sale].flatMap((list) => (list ? [list] : [])),
  );
  const ownerIds = unique(members.map((list) => list.userId));
  const saleIds = members.filter((list) => list.listType === "sale").map((list) => list.id);
  const addressesRead = fetchAddresses(ownerIds);
  const [accounts, addressRows, priceRows, entriesOf] = await Promise.all([
    db.select().from(user).where(inArray(user.id, ownerIds)),
    addressesRead,
    saleIds.length === 0
      ? []
      : db
          .select({
            listId: listEntries.listId,
            min: sql<number>`min(${listEntries.price})`,
            max: sql<number>`max(${listEntries.price})`,
          })
          .from(listEntries)
          .where(
            and(
              inArray(listEntries.listId, saleIds),
              isNotNull(listEntries.price),
              eq(listEntries.isQyop, false),
            ),
          )
          .groupBy(listEntries.listId),
    addressesRead.then((rows) => fetchPostEntries(members, addressesByUser(rows))),
  ]);
  const accountOf = new Map(accounts.map((account) => [account.id, account]));
  const nicknameOf = nicknamesByAddress(addressRows);
  const priceOf = new Map(priceRows.map((row) => [row.listId, row]));

  const side = (list: FeedList | null) => {
    if (!list) return null;
    // a chat card draws objekts only; a rule's entries stay on the post
    const { items, more, copyCount } = previewSide(
      (entriesOf.get(list.id) ?? []).filter((entry) => entry.ruleId === undefined),
      null,
      POST_CARD_LIMIT,
    );
    return { slugs: items.map((item) => item.slug), more, copyCount };
  };

  for (const { id, post } of found) {
    const account = accountOf.get(post.anchor.userId);
    if (!account) continue;
    // a sale list never pairs with a want list, so a sale post's price stands where Wants would
    const price = post.sale ? priceOf.get(post.sale.id) : undefined;
    const address = post.anchor.profileAddress?.toLowerCase() ?? null;
    result.set(id, {
      tag: post.tag,
      tags: post.tags,
      owner: {
        userId: account.id,
        handle: tradeHandle(addressRows.filter((row) => row.userId === account.id)),
        name: toPartnerIdentity(
          account.name,
          [post.have, post.want, post.sale].flatMap((list) =>
            list ? [{ profileAddress: list.profileAddress, matches: 0 }] : [],
          ),
          addressRows.filter((row) => row.userId === account.id),
        ).name,
      },
      list: {
        id: post.anchor.id,
        slug: post.anchor.slug,
        name: post.anchor.name,
        profileSlug: post.anchor.profileSlug,
        profile: address ? { address, nickname: nicknameOf.get(address) ?? null } : null,
      },
      has: side(post.have ?? post.sale),
      wants: side(post.want),
      price:
        price && post.sale?.currency
          ? { min: Number(price.min), max: Number(price.max), currency: post.sale.currency }
          : null,
    });
  }
  return result;
}

export type StaffPostState = "posted" | "off_trade" | "deleted";

export type StaffPost = {
  state: StaffPostState;
  /** null once the list is deleted */
  now: {
    tags: PostTag[];
    /** the anchor first */
    lists: { id: number; type: "have" | "want" | "sale"; name: string }[];
    slug: string;
    profileSlug: string | null;
    profileAddress: string | null;
  } | null;
};

/**
 * Posts as staff read them, by the id of a list a report named: the post that holds it now, off
 * Trade sides included, with no `visibleOnTrade` filter, so a block, a sanction or Trade hiding the
 * post never hides it from the console. Posted is the anchor's side on Trade in that row. A
 * trade-blocked owner's post reads as posted; the console shows the sanction.
 */
export async function staffPosts(listIds: number[]): Promise<Map<number, StaffPost>> {
  const result = new Map<number, StaffPost>(
    listIds.map((id) => [id, { state: "deleted", now: null }]),
  );
  if (listIds.length === 0) return result;

  const { rowOf, listById } = await namedPostsOf(listIds);

  for (const id of listIds) {
    const row = rowOf(id);
    const member = (listId: number | null) =>
      listId === null ? null : (listById.get(listId) ?? null);
    const named = member(id);
    // a list in no row is a post of its own, off Trade, with the defaults' Open to
    const posts = row
      ? postFromRow(row, member(row.leadListId), member(row.wantListId))
      : named
        ? pairPosts([
            { ...named, ...DEFAULT_OPEN_TO, linkedListId: null, postId: null, bumpedAt: null },
          ])
        : [];
    const post = posts.find((p) => [p.have, p.want, p.sale].some((list) => list?.id === id));
    if (!post) continue;
    const members = [post.anchor, ...(post.want && post.want !== post.anchor ? [post.want] : [])];
    result.set(id, {
      state:
        row &&
        sideStateOf(row, post.anchor).onTrade &&
        canBeOnTrade(post.anchor.listType, post.anchor.isProfileBind)
          ? "posted"
          : "off_trade",
      now: {
        tags: post.tags,
        lists: members.map((list) => ({
          id: list.id,
          type: list.listType as "have" | "want" | "sale",
          name: list.name,
        })),
        slug: post.anchor.slug,
        profileSlug: post.anchor.profileSlug,
        profileAddress: post.anchor.profileAddress?.toLowerCase() ?? null,
      },
    });
  }
  return result;
}
