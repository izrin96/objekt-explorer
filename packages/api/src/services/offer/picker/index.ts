import { db } from "@repo/db";
import { conversation, listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { holdsMessage, pairKey } from "../../../lib/chat-rules";
import {
  chooseMatchPicks,
  fillMatches,
  itemsOnLists,
  postSides,
  matchesThrough,
  nearGroups,
  type PartnerEntry,
} from "../../../lib/offer-prefill";
import { oneListOf } from "../../../lib/offer-recipient-rules";
import { itemFlags } from "../../../lib/offer-rules";
import { bestPairing, matchCounts } from "../../../lib/trade-person";
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
import { anchoredSerialIds } from "../../objekt/serial-anchored";
import { personNear } from "../../trade/feed/near";
import { askableOnTrade, matchableList, postPartnerSql } from "../../trade/lists";
import { recountPartners, resolveCompareSides } from "../../trade/matches";
import {
  type Addressed,
  type IndexedObjekt,
  fetchCopies,
  fetchObjekts,
  linkedAddresses,
  offerRulesOf,
  openOfferHolders,
  partnerHasLists,
  refuseOffer,
  reservedIds,
  resolveAddressed,
} from "../core";
import { mineCandidates } from "./mine";
import {
  type CandidatesPage,
  type PartnerRules,
  candidatesPage,
  collectionsOf,
  toCandidate,
  wantedAmong,
} from "./shared";
import {
  partnerListChoices,
  resolveTheirItems,
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
    // the rules never refuse, so the safety verdict still comes first
    const [safety, rules] = await Promise.all([
      addressed.start?.safety ?? chatSafety(me, addressed.partnerId),
      input.side === "theirs-collection" ? offerRulesOf(addressed.partnerId) : null,
    ]);
    if (safety.blocked || safety.partnerTradeBlocked) refuseOffer("not_accepting");
    // a closed collection offers nothing to ask for, and a stale tab can't page through it; a
    // partner with lists is refused in `theirCollectionPage`
    if (rules && !rules.allowCollectionAsks) return candidatesPage({ listed: false });
  }
  // only the builder's whole theirs list reads the rules, not every scroll page
  const withRules = input.side === "theirs" && input.offset === undefined;
  const [page, partnerRules] = await Promise.all([
    sidePage(me, addressed, input),
    withRules ? partnerRulesOf(addressed.partnerId) : undefined,
  ]);
  return partnerRules ? { ...page, partnerRules } : page;
}

async function sidePage(
  me: string,
  addressed: Addressed,
  input: Parameters<typeof offerCandidates>[2],
): Promise<CandidatesPage> {
  if (input.side === "mine") return mineCandidates(me, addressed, input.cursor, input);
  if (input.side === "theirs-collection") {
    return theirCollectionPage(me, addressed, input.cursor, input);
  }
  // without an offset the whole list comes back, as the builder checks picks against it
  if (input.offset !== undefined) return theirPickerPage(me, addressed, input.offset, input);
  const [page, choices] = await Promise.all([
    theirCandidates(me, addressed),
    partnerListChoices(addressed),
  ]);
  return { ...page, lists: choices.lists, wantLists: choices.wantLists };
}

/** Each rule only where it would filter something, as `createOffer` applies them. */
async function partnerRulesOf(partnerId: string): Promise<PartnerRules> {
  const [rules, hasLists, wants] = await Promise.all([
    offerRulesOf(partnerId),
    partnerHasLists(partnerId),
    wantedAmong(partnerId, []),
  ]);
  return {
    wantedOnly: rules.onlyWantedOffers,
    wantsOnTrade: wants !== null,
    onePost: hasLists,
    asksClosed: !hasLists && !rules.allowCollectionAsks,
  };
}

type SuggestInput = {
  partnerId: string;
  list?: string;
  mutual?: boolean;
  post?: string;
  lead?: string;
};

/**
 * The matches the partner's Trade row counts, filled by `fillMatches` (the Can swap pair, else
 * the bigger side), one copy per collection a side, chosen by `chooseMatchPicks`. `post` narrows
 * them to one post's lists: its have or sale list for the get side, its want list for the give
 * side. A row's You give is cut to one want list as You get is to one post.
 */
export async function suggestOffer(
  me: string,
  { partnerId, list, mutual, post, lead }: SuggestInput,
): Promise<Suggestion> {
  if (partnerId === me) refuseOffer("self");
  const empty = {
    give: [] as CandidateItem[],
    get: [] as CandidateItem[],
    matched: { give: 0, get: 0 },
    near: [] as SuggestedNear[],
    postName: null as string | null,
    postSlug: null as string | null,
    wantSlug: null as string | null,
    collections: {},
  };
  const { userLow, userHigh } = pairKey(me, partnerId);
  // each early result is the same `empty` and no read here refuses, so the order holds
  const [safety, sides, postLists, existing, pref, partnerLists] = await Promise.all([
    chatSafety(me, partnerId),
    resolveCompareSides(me, list, mutual ?? false),
    post === undefined ? null : postListsOf(partnerId, post),
    db
      .select({ id: conversation.id, lastMessageId: conversation.lastMessageId })
      .from(conversation)
      .where(and(eq(conversation.userLow, userLow), eq(conversation.userHigh, userHigh))),
    fetchPref(partnerId),
    // only a row cut chooses among the partner's lists, so a post skips the read
    post === undefined
      ? db
          .select({ id: lists.id, slug: lists.slug, name: lists.name, listType: lists.listType })
          .from(lists)
          .where(
            and(
              eq(lists.userId, partnerId),
              or(askableOnTrade, and(eq(lists.listType, "want"), eq(lists.discoverable, true))),
            ),
          )
          .orderBy(lists.id)
      : null,
  ]);
  if (safety.blocked || safety.tradeBlocked || safety.partnerTradeBlocked) return empty;
  if (post !== undefined && !postLists) return empty;
  // until the first message, someone who accepts no messages gets no suggestion at all
  const held = holdsMessage(existing[0]?.lastMessageId);
  if (!held && pref.allow === "nobody") return empty;
  if (sides.haveListIds.length === 0 && sides.wantListIds.length === 0) return empty;

  const [{ recounted }, nearLists] = await Promise.all([
    // an offer aims at this person on purpose, so a post the viewer hid still fills it
    recountPartners(me, sides, "all", { ownerIds: [partnerId], skipHiddenPosts: false }),
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
  const swapPair = partner ? matchCounts(partner).swapPair : null;
  // `swapPair` names a row; the pair's post is read by its lead list, which the offer keys by
  const pairLead = swapPair && partner ? bestPairing(partner)?.theirLead : undefined;
  const filled = partner
    ? fillMatches(partner, swapPair, postLists ?? undefined)
    : { get: [], give: [] };
  // a row's matches outside a Can swap pair come from one post (You get) or one want list (You give)
  const rowCut = post === undefined && !swapPair;
  // the uncut side matches: `filled` has already emptied You get when the give side is bigger
  const getAll = rowCut ? matchesThrough(partner?.theyHaveIWant ?? [], undefined) : filled.get;
  const giveAll = rowCut ? matchesThrough(partner?.iHaveTheyWant ?? [], undefined) : [];
  const leadPost = rowCut
    ? chooseList(
        getAll,
        (partnerLists ?? []).filter((row) => row.listType !== "want"),
        lead,
      )
    : null;
  const giveWant = rowCut
    ? chooseList(
        giveAll,
        (partnerLists ?? []).filter((row) => row.listType === "want"),
        lead,
      )
    : null;
  const onPostGet = leadPost
    ? getAll.filter((match) => match.partnerListIds.includes(leadPost.id))
    : filled.get;
  const giveOne = giveWant
    ? giveAll.filter((match) => match.partnerListIds.includes(giveWant.id))
    : [];
  // cut to one list, a side may hold fewer than it would: the bigger side wins again
  const giveWins = rowCut && giveOne.length > onPostGet.length;
  const onePost = giveWins ? null : leadPost;
  const getMatches = giveWins ? [] : onPostGet;
  const giveMatches = rowCut ? (giveWins ? giveOne : []) : filled.give;
  const offerIds = onePost ? new Set([onePost.id]) : postLists?.offerIds;

  const addressed: Addressed = {
    partnerId,
    conversationId: existing[0]?.id ?? null,
    empty: !held,
    start: null,
  };
  // near matches skip every match through the post, the side left unfilled too
  const nearWanted = nearGroups(nearLists, {
    give: new Set(
      matchesThrough(partner?.iHaveTheyWant ?? [], postLists?.wantIds).map((match) => match.slug),
    ),
    get: new Set(
      matchesThrough(partner?.theyHaveIWant ?? [], postLists?.offerIds).map((match) => match.slug),
    ),
  });
  // one read of what the partner may be asked for serves the matches and the near matches
  const theirsRead =
    getMatches.length > 0 || nearWanted.some((group) => group.side === "get")
      ? resolveTheirItems(me, addressed)
      : null;
  const [theirs, mine, offered, [pairPost], near] = await Promise.all([
    getMatches.length === 0 ? null : theirsRead,
    giveMatches.length === 0 ? [] : myCopies(me, giveMatches, addressed.conversationId),
    partnerEntries(
      getMatches.flatMap((match) => match.partnerListIds),
      getMatches.map((match) => match.slug),
    ),
    // a Can swap pair asks from one post already: its key is that post's have or sale list
    !onePost && !postLists && pairLead !== undefined && getMatches.length > 0
      ? db
          .select({ slug: lists.slug, name: lists.name })
          .from(lists)
          .where(and(eq(lists.id, pairLead), eq(lists.userId, partnerId)))
      : [],
    nearPicks(me, addressed, nearWanted, theirsRead),
  ]);
  const theirItems = theirs?.items ?? [];
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
        new Set(match.partnerListIds.filter((id) => !offerIds || offerIds.has(id))),
      ),
    })),
  );
  return {
    ...picks,
    near,
    postName: giveWins
      ? giveWant!.name
      : (onePost?.name ?? pairPost?.name ?? postLists?.name ?? null),
    wantSlug: giveWins ? giveWant!.slug : null,
    postSlug: onePost?.slug ?? pairPost?.slug ?? (postLists ? post! : null),
    collections: await collectionsOf(
      [...picks.give, ...picks.get, ...near.flatMap((group) => group.items)].map(
        (item) => item.collectionSlug,
      ),
    ),
  };
}

/** The one of the partner's lists a row's matches come from, or null when none holds a match. */
function chooseList<T extends { id: number; slug: string }>(
  matches: readonly { partnerListIds: readonly number[] }[],
  candidates: readonly T[],
  lead: string | undefined,
) {
  const chosen = oneListOf(matches, candidates, lead);
  return candidates.find((row) => row.id === chosen) ?? null;
}

type Suggestion = {
  give: CandidateItem[];
  get: CandidateItem[];
  matched: { give: number; get: number };
  near: SuggestedNear[];
  postName: string | null;
  postSlug: string | null;
  /** the want list You give's matches came from, when You give won */
  wantSlug: string | null;
  collections: Awaited<ReturnType<typeof collectionsOf>>;
};

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
  wanted: ReturnType<typeof nearGroups>,
  theirsRead: ReturnType<typeof resolveTheirItems> | null,
): Promise<SuggestedNear[]> {
  if (wanted.length === 0) return [];
  const gives = wanted.filter((group) => group.side === "give").flatMap((group) => group.matches);
  const gets = wanted.filter((group) => group.side === "get").flatMap((group) => group.matches);
  const [mine, theirs, offered] = await Promise.all([
    gives.length === 0 ? [] : myCopies(me, gives, addressed.conversationId),
    gets.length === 0 ? null : theirsRead,
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
  const named = alias(lists, "named");
  const rows = await db
    .select({ id: lists.id, slug: lists.slug, name: lists.name, listType: lists.listType })
    .from(lists)
    .where(
      and(
        eq(lists.userId, partnerId),
        eq(lists.discoverable, true),
        matchableList,
        or(
          eq(lists.slug, slug),
          inArray(
            lists.id,
            db
              .select({ id: postPartnerSql("named") })
              .from(named)
              .where(eq(named.slug, slug)),
          ),
        ),
      ),
    );
  // the named list must itself be on Trade; its pair half alone is not the post
  if (!rows.some((row) => row.slug === slug)) return null;
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
      ratio: sql<
        number | null
      >`CASE WHEN ${lists.listType} = 'have' THEN coalesce(${listEntries.ratio}, ${lists.ratio}) END`,
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
  const [reserved, holders, anchored] = await Promise.all([
    reservedIds(ids),
    openOfferHolders(ids, me),
    anchoredSerialIds(ids),
  ]);
  return [...found.values()].map(({ objekt, listSlug }) =>
    toCandidate(objekt, itemFlags(objekt, reserved, holders, conversationId), anchored, listSlug),
  );
}
