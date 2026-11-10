import { validArtists } from "@repo/cosmo/types/common";
import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import { collections } from "@repo/db/indexer/schema";
import { lists, user } from "@repo/db/schema";
import { and, inArray } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../../../lib/chat-rules";
import { iso } from "../../../lib/time";
import {
  assemblePost,
  browseMode,
  matchesViewer,
  narrowViewer,
  pairPosts,
  type Viewer,
} from "../../../lib/trade-feed";
import { addressesByUser, nicknamesByAddress, toPartnerIdentity } from "../../../lib/trade-rank";
import { unique } from "../../../lib/unique";
import type { CollectionFilters } from "../../../schemas/common/filters";
import { normalizeUserText } from "../../../schemas/common/user-text";
import { type BrowseFilters } from "../../../schemas/trade";
import { tradeHandle } from "../../../schemas/trade-person";
import { getCollectionFilters } from "../../activity/feed";
import { fetchRulesById } from "../../list/rules";
import { toPublicUser } from "../../profile";
import { getCache } from "../../redis";
import { reputationOf } from "../../reputation";
import { resolveCompareSides, type Sides } from "../matches";
import { fetchAddresses } from "../matches/holdings";
import { getMutualPeople } from "../matches/mutual";
import { type PersonMatch, personMatches } from "../matches/person";
import { type FeedList, feedListColumns, fetchPostEntries } from "./entries";
import { type FeedRow } from "./query";
import { fetchViewer, hasTradeList } from "./viewer";

/** a new collection reaches a filtered feed within this */
const FILTER_SLUGS_TTL_SECONDS = 300;

/**
 * The shared collection filters as slugs, resolved in the indexer; null when none is set. An
 * artist filter naming every artist leaves no collection out, so it is not one.
 */
async function resolveFilterSlugs(filters: BrowseFilters): Promise<string[] | null> {
  const coversEveryArtist = validArtists.every((artist) => filters.artist.includes(artist));
  const facets: CollectionFilters = {
    artist: coversEveryArtist ? [] : filters.artist,
    member: filters.member,
    season: filters.season,
    class: filters.class,
    on_offline: filters.on_offline,
    collection: filters.collection,
  };
  const predicates = getCollectionFilters(facets);
  if (predicates.length === 0) return null;
  // every page of a filtered feed asks again, and an artist alone can mean thousands of slugs
  const sorted = Object.values(facets).map((values) =>
    values.toSorted((a, b) => a.localeCompare(b)),
  );
  const key = new Bun.CryptoHasher("sha1").update(JSON.stringify(sorted)).digest("hex");
  return getCache(`trade:filter-slugs:1:${key}`, FILTER_SLUGS_TTL_SECONDS, async () => {
    const rows = await indexer
      .select({ slug: collections.slug })
      .from(collections)
      .where(and(...predicates));
    return rows.map((row) => row.slug);
  });
}

function toListLink(list: FeedList, nicknameOf: ReadonlyMap<string, string | null>) {
  const address = list.profileAddress?.toLowerCase() ?? null;
  return {
    id: list.id,
    slug: list.slug,
    name: list.name,
    description: list.description ? normalizeUserText(list.description) : null,
    listType: list.listType,
    currency: list.currency,
    profileSlug: list.profileSlug,
    profile: address ? { address, nickname: nicknameOf.get(address) ?? null } : null,
  };
}

type FeedMatch = { userId: string; sides: Sides; compared: Viewer };

/** A one-way Compare with list has no Mutual people: Mutual needs both of the viewer's sides. */
export async function mutualPeopleOf(match: { userId: string; sides: Sides }) {
  const { haveListIds, wantListIds } = match.sides;
  if (haveListIds.length === 0 || wantListIds.length === 0) return [];
  return getMutualPeople(match.userId, match.sides);
}

/** Stage 2: the posts of `rows`, up to `need`, with the viewer's rings and counts. */
export type LoadContext = {
  viewerId: string | null;
  viewer: Viewer | null;
  match: FeedMatch | null;
  slugs: string[] | null;
  input: Pick<BrowseFilters, "slug">;
};

export async function loadPosts(ctx: LoadContext, rows: FeedRow[], need: number) {
  const { viewerId, viewer, input, match, slugs } = ctx;
  const listIds = rows.flatMap((row) => (row.partner_id ? [row.id, row.partner_id] : [row.id]));
  const feedLists = await db.select(feedListColumns).from(lists).where(inArray(lists.id, listIds));
  const listById = new Map(feedLists.map((list) => [list.id, list]));
  const ownerIds = unique(feedLists.map((list) => list.userId));

  const [users, addressRows, reputations, persons] = await Promise.all([
    db.select().from(user).where(inArray(user.id, ownerIds)),
    fetchAddresses(ownerIds),
    reputationOf(ownerIds),
    viewerId === null
      ? new Map<string, PersonMatch>()
      : personMatches(viewerId, ownerIds, match?.sides),
  ]);
  const addressesOf = addressesByUser(addressRows);
  const userMap = new Map(users.map((u) => [u.id, u]));
  const nicknameOf = nicknamesByAddress(addressRows);

  const filter = {
    slugs: slugs ? new Set(slugs) : null,
    slug: input.slug ?? null,
    onlyMatches: match !== null,
  };
  const narrowed = filter.slugs !== null || filter.slug !== null || filter.onlyMatches;

  const membersOf = (row: FeedRow) =>
    [row.id, row.partner_id].flatMap((id) => {
      const list = id === null ? undefined : listById.get(id);
      return list ? [list] : [];
    });

  // stage 2 fills only the rows the page still needs; the over-fetched rest is read only
  // when ownership empties posts and the page comes up short
  const posts = [];
  // each owner's lists with the matches of the posts shown, to head the person
  const identityLists = new Map<string, { profileAddress: string | null; matches: number }[]>();
  let last: FeedRow | undefined;
  let examined = 0;
  while (posts.length < need && examined < rows.length) {
    const batch = rows.slice(examined, examined + need - posts.length);
    examined += batch.length;
    const entriesOf = await fetchPostEntries(batch.flatMap(membersOf), addressesOf, {
      stale: true,
    });
    const ruleDefs = await fetchRulesById(
      unique([
        ...[...entriesOf.values()].flat().flatMap((entry) => entry.ruleId ?? []),
        ...[...((viewer?.ruleRows ?? viewer?.ruleWant)?.values() ?? [])]
          .flat()
          .map((rule) => rule.ruleId),
      ]),
    );

    for (const row of batch) {
      last = row;
      const members = membersOf(row);
      const [post] = pairPosts(members);
      const account = userMap.get(post?.anchor.userId ?? "");
      if (!post || !account) continue;

      const assembled = assemblePost(
        post,
        (id) => entriesOf.get(id) ?? [],
        match?.compared ?? viewer,
        filter,
      );
      if (!assembled) continue;
      // SQL can't see that an owner sold the only matching objekt
      if (match && !matchesViewer(assembled.match)) continue;

      const matches = assembled.match ? assembled.match.youHave + assembled.match.youWant : 0;
      const owned = identityLists.get(account.id) ?? [];
      owned.push(...members.map((list) => ({ profileAddress: list.profileAddress, matches })));
      identityLists.set(account.id, owned);

      posts.push({
        id: post.anchor.id,
        tags: post.tags,
        narrowed,
        userId: account.id,
        user: toPublicUser(account),
        reputation: reputations.get(account.id) ?? null,
        identity: toPartnerIdentity(
          account.name,
          members.map((list) => ({ profileAddress: list.profileAddress, matches: 0 })),
          addressRows.filter((a) => a.userId === account.id),
        ),
        handle: tradeHandle(addressRows.filter((a) => a.userId === account.id)),
        bumpedAt: iso(post.bumpedAt),
        updatedAt: iso(post.updatedAt)!,
        sides: assembled.sides.map((side) => ({
          role: side.role,
          list: toListLink(side.list, nicknameOf),
          first: side.first,
          items: side.items,
          more: side.more,
          copyCount: side.copyCount,
          others: side.others,
          collectionCount: side.collectionCount,
          rules: side.rules.flatMap((tile) => {
            const rule = ruleDefs.get(tile.ruleId);
            if (!rule) return [];
            // signed out, there is no one to count for
            return [
              {
                ...tile,
                rule,
                matched: viewer ? tile.matched : null,
                matchedSlugs: viewer ? tile.matchedSlugs : [],
              },
            ];
          }),
          near: side.near,
        })),
        match: assembled.match,
        // the viewer's own rules, by the slugs they matched; For you names them under the strips
        ruleMatches: (assembled.ruleMatches ?? []).flatMap((found) => {
          const rule = ruleDefs.get(found.ruleId);
          return rule ? [{ ...found, rule }] : [];
        }),
        person: persons.get(account.id),
        messageable: isMessageable(toMessagePref({ allow: row.message_allow })),
      });
    }
  }
  const identities = new Map(
    [...identityLists].map(([ownerId, owned]) => [
      ownerId,
      toPartnerIdentity(
        userMap.get(ownerId)!.name,
        owned,
        addressRows.filter((a) => a.userId === ownerId),
      ),
    ]),
  );
  return { posts, last, examined, identities };
}

/** The viewer's side of a feed read, or null when nothing can be listed. */
export async function resolveFeed(viewerId: string | null, input: BrowseFilters) {
  const mode = browseMode(input);
  const [viewer, slugs, takesPart] = await Promise.all([
    viewerId === null ? null : fetchViewer(viewerId),
    resolveFilterSlugs(input),
    viewerId !== null && mode !== "off" ? hasTradeList(viewerId) : false,
  ]);
  if (slugs?.length === 0) return null;

  // the control shows on the same test, so a stale `match` from a viewer with no list on
  // Trade lists every post; a list that matches nothing yet empties the feed
  let match: FeedMatch | null = null;
  if (takesPart && viewer !== null && viewerId !== null) {
    const sides = await resolveCompareSides(viewerId, input.list, mode === "mutual");
    const compared = narrowViewer(viewer, sides);
    if (compared.have.size === 0 && compared.want.size === 0) return null;
    match = { userId: viewerId, sides, compared };
  }
  return { mode, viewer, slugs, match };
}
