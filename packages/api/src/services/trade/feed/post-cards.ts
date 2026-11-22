import { db } from "@repo/db";
import { listEntries, lists, tradePost, user } from "@repo/db/schema";
import { type SQL, and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { previewSide } from "../../../lib/trade-feed";
import { type PostRow, sideStateOf } from "../../../lib/trade-post-state";
import { pairPosts, postFromRow, type PostTag } from "../../../lib/trade-posts";
import { addressesByUser, nicknamesByAddress, toPartnerIdentity } from "../../../lib/trade-rank";
import { listPostSql } from "../../../lib/trade-sql";
import { unique } from "../../../lib/unique";
import type { PostCardView } from "../../../schemas/chat";
import { canBeOnTrade } from "../../../schemas/list";
import { tradeHandle } from "../../../schemas/trade-person";
import { fetchAddresses } from "../matches/holdings";
import {
  type FeedList,
  type FeedListRow,
  feedListColumns,
  fetchPostEntries,
  fetchPostRows,
} from "./entries";
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

/** The rows by primary key, and those rows' lists that `listWhere` keeps, in one round trip. */
export async function postsByRowOf(rowIds: number[], listWhere?: SQL) {
  const [rowById, members] = await Promise.all([
    fetchPostRows(inArray(tradePost.id, rowIds)),
    db
      .select(feedListColumns)
      .from(lists)
      .where(
        and(
          inArray(
            lists.id,
            db
              .select({
                id: sql<number>`unnest(ARRAY[${tradePost.leadListId}, ${tradePost.wantListId}])`,
              })
              .from(tradePost)
              .where(inArray(tradePost.id, rowIds)),
          ),
          listWhere,
        ),
      ),
  ]);
  return { rowById, listById: new Map(members.map((list) => [list.id, list])) };
}

/** What a post card names: the list it was sent from, and the post's row on a card that names it. */
export type PostCardRef = { listId: number; postId?: number };

/** The key {@link fetchPostCards} files a card's post under. */
export const postCardKey = (ref: PostCardRef) =>
  ref.postId === undefined ? `list:${ref.listId}` : `row:${ref.postId}:${ref.listId}`;

export type PostCardRead = { post: PostCardPost | null; postId: number | null };

/**
 * Posts as a chat card draws them, under {@link postCardKey}, from their sides on Trade. A card
 * that names its row shows that row's post, the one holding the card's list while one does, so it
 * follows the post through its owner's edits; it reads null once the row is gone or has no side on
 * Trade. A card from before cards named their row shows the post that holds its list now
 * ({@link listPostSql}), and null once the list is gone or its side there is off Trade.
 */
export async function fetchPostCards(
  refs: PostCardRef[],
  viewerId: string | null,
): Promise<Map<string, PostCardRead>> {
  const result = new Map<string, PostCardRead>(
    refs.map((ref) => [postCardKey(ref), { post: null, postId: null }]),
  );
  if (refs.length === 0) return result;

  const byList = unique(refs.flatMap((ref) => (ref.postId === undefined ? [ref.listId] : [])));
  const byRow = unique(refs.flatMap((ref) => (ref.postId === undefined ? [] : [ref.postId])));
  const visible = visibleOnTrade(viewerId);
  const [named, rows] = await Promise.all([
    byList.length === 0 ? null : namedPostsOf(byList, visible),
    byRow.length === 0 ? null : postsByRowOf(byRow, visible),
  ]);
  // a card shows only the sides on Trade
  const postsOf = <L extends FeedListRow>(row: PostRow, listById: ReadonlyMap<number, L>) => {
    const side = (listId: number | null, onTrade: boolean) =>
      listId !== null && onTrade ? (listById.get(listId) ?? null) : null;
    return postFromRow(
      row,
      side(row.leadListId, row.leadOnTrade),
      side(row.wantListId, row.wantOnTrade),
    );
  };
  const holds = (
    post: {
      have?: { id: number } | null;
      want?: { id: number } | null;
      sale?: { id: number } | null;
    },
    listId: number,
  ) => [post.have, post.want, post.sale].some((list) => list?.id === listId);
  const found = [...new Map(refs.map((ref) => [postCardKey(ref), ref]))].flatMap(([key, ref]) => {
    if (ref.postId === undefined) {
      const row = named?.rowOf(ref.listId);
      // the post only while the named list's side is on Trade
      const post = row && postsOf(row, named!.listById).find((p) => holds(p, ref.listId));
      return post ? [{ key, postId: row.id, post }] : [];
    }
    const row = rows?.rowById.get(ref.postId);
    const posts = row ? postsOf(row, rows!.listById) : [];
    const post = posts.find((p) => holds(p, ref.listId)) ?? posts[0];
    return row && post ? [{ key, postId: row.id, post }] : [];
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

  for (const { key, postId, post } of found) {
    const account = accountOf.get(post.anchor.userId);
    if (!account) continue;
    // a sale list never pairs with a want list, so a sale post's price stands where Wants would
    const price = post.sale ? priceOf.get(post.sale.id) : undefined;
    const address = post.anchor.profileAddress?.toLowerCase() ?? null;
    result.set(key, {
      postId,
      post: {
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
      },
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
 * Posts as staff read them, under {@link postCardKey}, by what a report snapshot names: its row
 * while the row exists (the post that holds the snapshot's list while one does, else the row's
 * anchor's), else the post that holds the snapshot's list now. Off Trade sides are included, with
 * no `visibleOnTrade` filter, so a block, a sanction or Trade hiding the post never hides it from
 * the console. Posted is the anchor's side on Trade in that row. A trade-blocked owner's post
 * reads as posted; the console shows the sanction.
 */
export async function staffPosts(refs: PostCardRef[]): Promise<Map<string, StaffPost>> {
  const result = new Map<string, StaffPost>(
    refs.map((ref) => [postCardKey(ref), { state: "deleted", now: null }]),
  );
  if (refs.length === 0) return result;

  const rowIds = unique(refs.flatMap((ref) => (ref.postId === undefined ? [] : [ref.postId])));
  const [named, rows] = await Promise.all([
    namedPostsOf(unique(refs.map((ref) => ref.listId))),
    rowIds.length === 0 ? null : postsByRowOf(rowIds),
  ]);

  for (const [key, ref] of new Map(refs.map((ref) => [postCardKey(ref), ref]))) {
    const byRow = ref.postId === undefined ? undefined : rows?.rowById.get(ref.postId);
    const row = byRow ?? named.rowOf(ref.listId);
    const listById = byRow ? rows!.listById : named.listById;
    const member = (listId: number | null) =>
      listId === null ? null : (listById.get(listId) ?? null);
    const holds = (p: {
      have?: { id: number } | null;
      want?: { id: number } | null;
      sale?: { id: number } | null;
    }) => [p.have, p.want, p.sale].some((list) => list?.id === ref.listId);
    const listed = member(ref.listId);
    // a list in no row is a post of its own, off Trade, as its lists read it
    const posts = row
      ? postFromRow(row, member(row.leadListId), member(row.wantListId))
      : listed
        ? pairPosts([{ ...listed, linkedListId: null, postId: null, bumpedAt: null }])
        : [];
    const post = posts.find(holds) ?? (byRow ? posts[0] : undefined);
    if (!post) continue;
    const members = [post.anchor, ...(post.want && post.want !== post.anchor ? [post.want] : [])];
    result.set(key, {
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
