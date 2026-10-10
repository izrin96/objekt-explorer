import { db } from "@repo/db";
import {
  hiddenTradePartner,
  listEntries,
  lists,
  messagePref,
  user,
  userBlock,
} from "@repo/db/schema";
import { tradeVersionKey } from "@repo/lib/server/list-touch";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, or } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../../lib/chat-rules";
import {
  collectionVerdict,
  countDropped,
  groupBySlug,
  matchSides,
  type MyHaves,
  type OwnedEntry,
  rankPartners,
  recount,
  toPartnerIdentity,
  addressesByUser,
  nicknamesByAddress,
} from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import { CARD_LIMIT, type TradeFilter } from "../../schemas/trade";
import { fetchCollectionsBySlug } from "../list";
import { toPublicUser } from "../profile";
import { getCache, redis } from "../redis";
import { reputationOf } from "../reputation";
import { marketVersion } from "../safety-cache";
import { takesPartInTrade } from "../trade-lists";
import { fetchTradeCandidates } from "./candidates";
import { fetchAddresses, fetchHoldings } from "./holdings";

type Sides = ReturnType<typeof matchSides>;

/**
 * The user's bound have and sale lists and their want lists, narrowed by `slug` when it names
 * one of them, and by a one-way `filter`. A have or sale list counts only while bound to a profile.
 */
export async function resolveTradeSides(
  userId: string,
  slug: string | undefined,
  filter: TradeFilter,
): Promise<Sides> {
  const myLists = await db
    .select({
      id: lists.id,
      slug: lists.slug,
      listTypeNew: lists.listTypeNew,
      linkedListId: lists.linkedListId,
    })
    .from(lists)
    .where(and(eq(lists.userId, userId), takesPartInTrade));
  const named = slug === undefined ? undefined : myLists.find((list) => list.slug === slug);
  return matchSides(myLists, named?.id ?? null, filter);
}

const CACHE_TTL_SECONDS = 300;

export async function getTradeMatches(userId: string, sides: Sides, filter: TradeFilter) {
  const [version, market] = await Promise.all([
    redis.get(tradeVersionKey(userId)).then((v) => v ?? "0"),
    marketVersion(),
  ]);
  return getCache(
    `trade:foryou:${userId}:${version}:${market}:${filter}:${sides.listId ?? "all"}`,
    CACHE_TTL_SECONDS,
    () => computeTradeMatches(userId, sides, filter),
  );
}

export type TradeMatches = Awaited<ReturnType<typeof computeTradeMatches>>;

/** Read past the matches cache, so a partner's Messages setting applies on the next load. */
export async function withMessageable(matches: TradeMatches) {
  const ids = matches.partners.map((partner) => partner.userId);
  const prefs =
    ids.length === 0
      ? []
      : await db
          .select({
            userId: messagePref.userId,
            allow: messagePref.allow,
          })
          .from(messagePref)
          .where(inArray(messagePref.userId, ids));
  const prefOf = new Map(prefs.map((row) => [row.userId, row]));
  return {
    ...matches,
    partners: matches.partners.map((partner) =>
      Object.assign(partner, {
        messageable: isMessageable(toMessagePref(prefOf.get(partner.userId))),
      }),
    ),
  };
}

/** Read past the matches cache, which outlives a reputation change. */
export async function withReputation(matches: Awaited<ReturnType<typeof withMessageable>>) {
  const reputations = await reputationOf(matches.partners.map((partner) => partner.userId));
  return {
    ...matches,
    partners: matches.partners.map((partner) =>
      Object.assign(partner, { reputation: reputations.get(partner.userId) ?? null }),
    ),
  };
}

async function computeTradeMatches(userId: string, sides: Sides, filter: TradeFilter) {
  const now = new Date();
  const [candidates, hidden, blocked] = await Promise.all([
    fetchTradeCandidates(userId, sides, filter),
    db.$count(hiddenTradePartner, eq(hiddenTradePartner.userId, userId)),
    // only the user's own blocks: counting who blocked them would tell them
    db.$count(userBlock, eq(userBlock.blockerId, userId)),
  ]);

  const theyHaveSlugs = unique(candidates.flatMap((c) => c.theyHave.map((e) => e.slug)));
  const theyWantSlugs = unique(candidates.flatMap((c) => c.theyWant.map((e) => e.slug)));
  const partnerIds = candidates.map((c) => c.userId);

  const [myEntries, addressRows] = await Promise.all([
    candidates.length === 0
      ? []
      : db
          .select({
            listId: listEntries.listId,
            slug: listEntries.collectionSlug,
            objektId: listEntries.objektId,
            listTypeNew: lists.listTypeNew,
          })
          .from(listEntries)
          .innerJoin(lists, eq(lists.id, listEntries.listId))
          .where(
            or(
              and(
                inArray(listEntries.listId, sides.haveListIds),
                inArray(listEntries.collectionSlug, theyWantSlugs),
              ),
              and(
                inArray(listEntries.listId, sides.wantListIds),
                inArray(listEntries.collectionSlug, theyHaveSlugs),
              ),
            ),
          ),
    fetchAddresses([userId, ...partnerIds]),
  ]);

  const addressesOf = addressesByUser(addressRows);
  const none = new Set<string>();

  const haveIds = new Set(sides.haveListIds);
  const myHaveEntries: OwnedEntry[] = [];
  const mySaleListIds = new Set<number>();
  const myWants = new Map<string, number[]>();
  for (const entry of myEntries) {
    if (entry.slug === null) continue;
    if (haveIds.has(entry.listId)) {
      myHaveEntries.push({ listId: entry.listId, slug: entry.slug, objektId: entry.objektId });
      if (entry.listTypeNew === "sale") mySaleListIds.add(entry.listId);
    } else {
      myWants.set(entry.slug, unique([...(myWants.get(entry.slug) ?? []), entry.listId]));
    }
  }

  const owned = [
    ...myHaveEntries.map((entry) => ({ entry, userId })),
    ...candidates.flatMap((c) => c.theyHave.map((entry) => ({ entry, userId: c.userId }))),
  ];
  const holdings = await fetchHoldings(
    unique(owned.flatMap(({ entry }) => (entry.objektId ? [entry.objektId] : []))),
    unique(owned.flatMap(({ entry }) => (entry.objektId ? [] : [entry.slug]))),
    unique(
      owned.flatMap(({ entry, userId: owner }) =>
        entry.objektId ? [] : Array.from(addressesOf.get(owner) ?? none),
      ),
    ),
  );

  const myAddresses = addressesOf.get(userId) ?? none;
  const judge = (entries: OwnedEntry[]) =>
    new Map(
      [...groupBySlug(entries)].map(([slug, group]) => [
        slug,
        collectionVerdict(group, myAddresses, holdings),
      ]),
    );
  const myHaves: MyHaves = {
    all: judge(myHaveEntries),
    trade: judge(myHaveEntries.filter((entry) => !mySaleListIds.has(entry.listId))),
  };

  const recounted = candidates.map((c) =>
    recount(c, addressesOf.get(c.userId) ?? none, holdings, myWants, myHaves),
  );
  const ranked = rankPartners(recounted, filter, now);

  const rankedIds = ranked.map((r) => r.partner.userId);
  const partnerListIds = unique(
    ranked.flatMap(({ partner }) =>
      [...partner.theyHaveIWant, ...partner.iHaveTheyWant].flatMap((m) => m.partnerListIds),
    ),
  );
  // the card shows the first of each list in slug order, so draw from that order
  const drawn = unique(
    ranked
      .flatMap(({ partner }) => [
        ...partner.theyHaveIWant.toSorted(bySlug).slice(0, CARD_LIMIT),
        ...partner.iHaveTheyWant.toSorted(bySlug).slice(0, CARD_LIMIT),
        ...partner.dropped.toSorted(bySlug).slice(0, CARD_LIMIT),
      ])
      .map((item) => item.slug),
  );

  const [users, partnerLists, collectionRows] = await Promise.all([
    rankedIds.length === 0 ? [] : db.select().from(user).where(inArray(user.id, rankedIds)),
    partnerListIds.length === 0
      ? []
      : db
          .select({
            id: lists.id,
            userId: lists.userId,
            slug: lists.slug,
            name: lists.name,
            listTypeNew: lists.listTypeNew,
            profileAddress: lists.profileAddress,
            profileSlug: lists.profileSlug,
          })
          .from(lists)
          .where(inArray(lists.id, partnerListIds)),
    fetchCollectionsBySlug(drawn, []),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const nicknameOf = nicknamesByAddress(addressRows);

  const partners = ranked.flatMap(({ partner, idle }) => {
    const account = userMap.get(partner.userId);
    if (!account) return [];

    const matches = [...partner.theyHaveIWant, ...partner.iHaveTheyWant];
    const ownLists = partnerLists
      .filter((list) => list.userId === partner.userId)
      .map((list) => ({
        id: list.id,
        slug: list.slug,
        name: list.name,
        listTypeNew: list.listTypeNew,
        profileAddress: list.profileAddress,
        profileSlug: list.profileSlug,
        profileNickname: list.profileAddress
          ? (nicknameOf.get(list.profileAddress.toLowerCase()) ?? null)
          : null,
        matches: matches.filter((m) => m.partnerListIds.includes(list.id)).length,
      }));

    return [
      {
        userId: partner.userId,
        user: toPublicUser(account),
        identity: toPartnerIdentity(
          account.name,
          ownLists,
          addressRows.filter((row) => row.userId === partner.userId),
        ),
        idle,
        updatedAt: partner.updatedAt,
        lists: ownLists.toSorted((a, b) => b.matches - a.matches),
        theyHaveIWant: partner.theyHaveIWant.toSorted(bySlug),
        iHaveTheyWant: partner.iHaveTheyWant.toSorted(bySlug),
        dropped: partner.dropped.toSorted(bySlug),
      },
    ];
  });

  return {
    checkedAt: now.toISOString(),
    partners,
    notShown: { ...countDropped(recounted), hidden, blocked },
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}

const bySlug = (a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug);
