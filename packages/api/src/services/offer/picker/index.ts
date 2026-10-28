import { db } from "@repo/db";
import { conversation, listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { holdsMessage, pairKey } from "../../../lib/chat-rules";
import {
  chooseMatchPicks,
  fillMatches,
  itemsOnLists,
  postSides,
  matchesThrough,
  type NearList,
  nearGroups,
  type PartnerEntry,
} from "../../../lib/offer-prefill";
import { itemFlags } from "../../../lib/offer-rules";
import { matchCounts } from "../../../lib/trade-person";
import type { Match } from "../../../lib/trade-rank";
import { unique } from "../../../lib/unique";
import { type ChatTarget } from "../../../schemas/chat";
import {
  type CandidateCursor,
  type CandidateItem,
  type PickerNarrowing,
} from "../../../schemas/offer";
import type { NearVerb } from "../../../schemas/trade";
import { chatSafety, fetchPref } from "../../chat";
import { personNear } from "../../trade-feed";
import { takesPartInTrade } from "../../trade-lists";
import { recountPartners, resolveCompareSides } from "../../trade-matches";
import {
  type Addressed,
  type IndexedObjekt,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  openOfferHolders,
  refuseOffer,
  reservedIds,
  resolveAddressed,
} from "../core";
import { mineCandidates } from "./mine";
import { type CandidatesPage, collectionsOf, toCandidate } from "./shared";
import {
  partnerListChoices,
  theirCandidates,
  theirCollectionPage,
  theirPickerPage,
} from "./theirs";

export async function offerCandidates(
  me: string,
  meCreatedAt: Date,
  input: {
    conversationId?: number;
    target?: ChatTarget;
    side: "mine" | "theirs" | "theirs-collection";
    cursor?: CandidateCursor;
    offset?: number;
  } & PickerNarrowing,
): Promise<CandidatesPage> {
  const addressed = await resolveAddressed(me, meCreatedAt, input);
  // however the partner was named: the start verdict lets an existing conversation through
  // whatever the blocks
  if (input.side !== "mine") {
    const safety = addressed.start?.safety ?? (await chatSafety(me, addressed.partnerId));
    if (safety.blocked || safety.partnerTradeBlocked) refuseOffer("not_accepting");
  }
  if (input.side === "mine") return mineCandidates(me, addressed, input.cursor, input);
  if (input.side === "theirs-collection") {
    return theirCollectionPage(me, addressed, input.cursor, input);
  }
  // without an offset the whole list comes back, as the builder checks picks against it
  if (input.offset !== undefined) return theirPickerPage(me, addressed, input.offset, input);
  const [page, lists] = await Promise.all([
    theirCandidates(me, addressed),
    partnerListChoices(addressed),
  ]);
  return { ...page, lists };
}

type SuggestInput = { partnerId: string; list?: string; mutual?: boolean; post?: string };

/**
 * The matches the partner's Trade row counts, filled by `fillMatches` (the Can swap pair, else
 * the bigger side), one copy per collection a side, chosen by `chooseMatchPicks`. `post` narrows
 * them to one post's lists: its have or sale list for the get side, its want list for the give
 * side.
 */
export async function suggestOffer(me: string, { partnerId, list, mutual, post }: SuggestInput) {
  if (partnerId === me) refuseOffer("self");
  const empty = {
    give: [] as CandidateItem[],
    get: [] as CandidateItem[],
    matched: { give: 0, get: 0 },
    near: [] as SuggestedNear[],
    postName: null as string | null,
    collections: {},
  };
  const safety = await chatSafety(me, partnerId);
  if (safety.blocked || safety.tradeBlocked || safety.partnerTradeBlocked) return empty;

  const { userLow, userHigh } = pairKey(me, partnerId);
  const [sides, postLists, existing] = await Promise.all([
    resolveCompareSides(me, list, mutual ?? false),
    post === undefined ? null : postListsOf(partnerId, post),
    db
      .select({ id: conversation.id, lastMessageId: conversation.lastMessageId })
      .from(conversation)
      .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh))),
  ]);
  if (post !== undefined && !postLists) return empty;
  // until the first message, someone who accepts no messages is not read at all
  const held = holdsMessage(existing[0]?.lastMessageId);
  if (!held && (await fetchPref(partnerId)).allow === "nobody") return empty;
  if (sides.haveListIds.length === 0 && sides.wantListIds.length === 0) return empty;

  const [{ recounted }, nearLists] = await Promise.all([
    recountPartners(me, sides, "all", { ownerIds: [partnerId] }),
    // the strips' near matches, narrowed as the strips are: by Compare with when a list is named
    personNear(
      me,
      partnerId,
      list === undefined ? null : sides,
      postLists ? new Set([...postLists.offerIds, ...postLists.wantIds]) : undefined,
    ),
  ]);
  // a person with near matches only still gets them
  const partner = recounted.find((row) => row.userId === partnerId);
  const { get: getMatches, give: giveMatches } = partner
    ? fillMatches(partner, matchCounts(partner).swapPair, postLists ?? undefined)
    : { get: [], give: [] };

  const addressed: Addressed = {
    partnerId,
    conversationId: existing[0]?.id ?? null,
    empty: !held,
    start: null,
  };
  const [theirs, mine, offered] = await Promise.all([
    getMatches.length === 0
      ? null
      : theirCandidates(
          me,
          addressed,
          getMatches.map((match) => match.slug),
        ),
    giveMatches.length === 0 ? [] : myCopies(me, giveMatches, addressed.conversationId),
    partnerEntries(
      getMatches.flatMap((match) => match.partnerListIds),
      getMatches.map((match) => match.slug),
    ),
  ]);

  const theirItems = theirs?.items ?? [];
  // near matches skip every match through the post, the side left unfilled too
  const near = await nearPicks(me, addressed, nearLists, {
    give: new Set(
      matchesThrough(partner?.iHaveTheyWant ?? [], postLists?.wantIds).map((match) => match.slug),
    ),
    get: new Set(
      matchesThrough(partner?.theyHaveIWant ?? [], postLists?.offerIds).map((match) => match.slug),
    ),
  });
  const picks = chooseMatchPicks(
    giveMatches.map((match) => ({
      slug: match.slug,
      items: mine.filter((item) => item.collectionSlug === match.slug),
    })),
    getMatches.map((match) => ({
      slug: match.slug,
      items: itemsOnLists(
        theirItems,
        offered,
        match.slug,
        new Set(match.partnerListIds.filter((id) => !postLists || postLists.offerIds.has(id))),
      ),
    })),
  );
  return {
    ...picks,
    near,
    postName: postLists?.name ?? null,
    collections: await collectionsOf(
      [...picks.give, ...picks.get, ...near.flatMap((group) => group.items)].map(
        (item) => item.collectionSlug,
      ),
    ),
  };
}

/** Near matches the builder offers to add, one group per side and verb, picked as matches are. */
export type SuggestedNear = { side: "give" | "get"; verb: NearVerb; items: CandidateItem[] };

/**
 * One copy per near collection, by the rules for matches: under You give from the viewer's lists
 * behind a want list's near match, under You get from the person's list. A collection already
 * added as a match on that side is left out.
 */
async function nearPicks(
  me: string,
  addressed: Addressed,
  nearLists: readonly NearList[],
  matched: { give: ReadonlySet<string>; get: ReadonlySet<string> },
): Promise<SuggestedNear[]> {
  const wanted = nearGroups(nearLists, matched);
  if (wanted.length === 0) return [];
  const gives = wanted.filter((group) => group.side === "give").flatMap((group) => group.matches);
  const gets = wanted.filter((group) => group.side === "get").flatMap((group) => group.matches);
  const [mine, theirs, offered] = await Promise.all([
    gives.length === 0 ? [] : myCopies(me, gives, addressed.conversationId),
    gets.length === 0
      ? null
      : theirCandidates(
          me,
          addressed,
          gets.map((match) => match.slug),
        ),
    partnerEntries(
      gets.flatMap((match) => match.partnerListIds),
      gets.map((match) => match.slug),
    ),
  ]);
  const theirItems = theirs?.items ?? [];
  return wanted.flatMap(({ side, verb, matches }) => {
    const picks =
      side === "give"
        ? chooseMatchPicks(
            matches.map((match) => ({
              slug: match.slug,
              items: mine.filter((item) => item.collectionSlug === match.slug),
            })),
            [],
          ).give
        : chooseMatchPicks(
            [],
            matches.map((match) => ({
              slug: match.slug,
              items: itemsOnLists(theirItems, offered, match.slug, new Set(match.partnerListIds)),
            })),
          ).get;
    return picks.length > 0 ? [{ side, verb, items: picks }] : [];
  });
}

/** The partner's post named by one of its lists (`postSides`), null when it is not on Trade. */
async function postListsOf(partnerId: string, slug: string) {
  const onTrade = and(eq(lists.userId, partnerId), eq(lists.discoverable, true), takesPartInTrade);
  const [named] = await db
    .select({ id: lists.id, linkedListId: lists.linkedListId })
    .from(lists)
    .where(and(onTrade, eq(lists.slug, slug)));
  if (!named) return null;
  const rows = await db
    .select({
      id: lists.id,
      name: lists.name,
      listType: lists.listType,
    })
    .from(lists)
    .where(
      and(
        onTrade,
        inArray(lists.id, [named.id, ...(named.linkedListId ? [named.linkedListId] : [])]),
      ),
    );
  return postSides(rows);
}

/**
 * The entries of those lists on `slugs`. The picker keeps one list per objekt, so an objekt on two
 * lists is matched back here to the list its match runs through.
 */
async function partnerEntries(ids: number[], slugs: string[]) {
  if (ids.length === 0 || slugs.length === 0) return [];
  const rows = await db
    .select({
      listId: lists.id,
      listSlug: lists.slug,
      hideSerial: lists.hideSerial,
      collectionSlug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
    })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(and(inArray(lists.id, unique(ids)), inArray(listEntries.collectionSlug, slugs)))
    .orderBy(listEntries.id);
  return rows.flatMap((row): PartnerEntry[] =>
    row.collectionSlug === null ? [] : [{ ...row, collectionSlug: row.collectionSlug }],
  );
}

/**
 * Every copy the viewer could give for the matches: the entries on the match's own lists, each
 * specific objekt and each held copy of an any-copy entry, with its flags.
 */
async function myCopies(
  me: string,
  matches: Pick<Match, "slug" | "myListIds">[],
  conversationId: number | null,
) {
  const listIds = unique(matches.flatMap((match) => match.myListIds));
  const slugs = unique(matches.map((match) => match.slug));
  const entries = await db
    .select({
      listSlug: lists.slug,
      collectionSlug: listEntries.collectionSlug,
      objektId: listEntries.objektId,
    })
    .from(listEntries)
    .innerJoin(lists, eq(lists.id, listEntries.listId))
    .where(and(inArray(listEntries.listId, listIds), inArray(listEntries.collectionSlug, slugs)))
    .orderBy(listEntries.id);
  const offering = entries.filter((entry) => entry.collectionSlug !== null);
  const addresses = [...((await linkedAddresses([me])).get(me) ?? [])];
  const [tokens, copies] = await Promise.all([
    fetchObjekts(offering.flatMap((e) => (e.objektId ? [e.objektId] : []))),
    fetchCopies(
      unique(offering.flatMap((e) => (e.objektId === null ? [e.collectionSlug!] : []))),
      addresses,
    ),
  ]);
  const owned = new Set(addresses);
  const found = new Map<string, { objekt: IndexedObjekt; listSlug: string }>();
  for (const entry of offering) {
    const held = entry.objektId
      ? [tokens.get(entry.objektId)].filter((o) => o?.slug === entry.collectionSlug)
      : copies.filter((o) => o.slug === entry.collectionSlug);
    for (const objekt of held) {
      if (objekt && owned.has(objekt.owner) && !found.has(objekt.id)) {
        found.set(objekt.id, { objekt, listSlug: entry.listSlug });
      }
    }
  }
  const ids = [...found.keys()];
  const [reserved, holders] = await Promise.all([reservedIds(ids), openOfferHolders(ids, me)]);
  return [...found.values()].map(({ objekt, listSlug }) =>
    toCandidate(objekt, itemFlags(objekt, reserved, holders, conversationId), listSlug),
  );
}
