import { db } from "@repo/db";
import { listEntries, lists, user } from "@repo/db/schema";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { listOnTrade } from "../../../lib/report-post";
import { pairPosts, type PostTag, previewSide } from "../../../lib/trade-feed";
import { addressesByUser, nicknamesByAddress, toPartnerIdentity } from "../../../lib/trade-rank";
import { unique } from "../../../lib/unique";
import type { PostCardView } from "../../../schemas/chat";
import { tradeHandle } from "../../../schemas/trade-person";
import { postPartnerSql } from "../lists";
import { fetchAddresses } from "../matches/holdings";
import { type FeedList, feedListColumns, fetchPostEntries } from "./entries";
import { visibleOnTrade } from "./shared";

const POST_CARD_LIMIT = 6;

type PostCardPost = NonNullable<PostCardView["post"]>;

/** The named lists and the other half of each one's pair, whichever half is named. */
function inPostsOf(listIds: number[]) {
  const named = alias(lists, "named");
  const partnerIds = db
    .select({ id: postPartnerSql("named") })
    .from(named)
    .where(inArray(named.id, listIds));
  return or(inArray(lists.id, listIds), inArray(lists.id, partnerIds));
}

/**
 * Posts as a chat card draws them, by the id of the list the card was sent from; a list that is
 * gone, or no longer shown on Trade, maps to null. A card's list is either half of a pair: the
 * post is the one that holds it now, so a want list later linked to a have list shows that post.
 */
export async function fetchPostCards(
  listIds: number[],
  viewerId: string | null,
): Promise<Map<number, PostCardPost | null>> {
  const result = new Map<number, PostCardPost | null>(listIds.map((id) => [id, null]));
  if (listIds.length === 0) return result;

  const owned = await db
    .select(feedListColumns)
    .from(lists)
    .where(and(inPostsOf(listIds), visibleOnTrade(viewerId)));
  const posts = pairPosts(owned);
  const found = listIds.flatMap((id) => {
    const post = posts.find((p) => [p.have, p.want, p.sale].some((list) => list?.id === id));
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
 * Posts as staff read them, by the id of a list a report named: the post that holds it now, with
 * no `visibleOnTrade` filter, so a block, a sanction or Trade hiding the post never hides it from
 * the console. A trade-blocked owner's post reads as posted; the console shows the sanction.
 */
export async function staffPosts(listIds: number[]): Promise<Map<number, StaffPost>> {
  const result = new Map<number, StaffPost>(
    listIds.map((id) => [id, { state: "deleted", now: null }]),
  );
  if (listIds.length === 0) return result;

  const columns = { ...feedListColumns, discoverable: lists.discoverable };
  const rows = await db.select(columns).from(lists).where(inPostsOf(listIds));
  const posts = pairPosts(rows);

  for (const id of listIds) {
    const post = posts.find((p) => [p.have, p.want, p.sale].some((list) => list?.id === id));
    if (!post) continue;
    const members = [post.anchor, ...(post.want && post.want !== post.anchor ? [post.want] : [])];
    result.set(id, {
      state: listOnTrade(post.anchor) ? "posted" : "off_trade",
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
