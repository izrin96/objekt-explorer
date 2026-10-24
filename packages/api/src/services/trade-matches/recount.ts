import { db } from "@repo/db";
import { listEntries, lists } from "@repo/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";

import { matchCounts } from "../../lib/trade-person";
import {
  addressesByUser,
  collectionVerdict,
  groupBySlug,
  matchSides,
  type MyHaves,
  type MyWant,
  type OwnedEntry,
  recount,
} from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import { mutualOf, type TradeFilter } from "../../schemas/trade";
import { takesPartInTrade } from "../trade-lists";
import { type CandidateOptions, fetchTradeCandidates } from "./candidates";
import { fetchAddresses, fetchHoldings } from "./holdings";

// Kept clear of `services/redis` (and so of `env.ts`): the worker imports this module.

export type Sides = ReturnType<typeof matchSides>;

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
      listType: lists.listType,
      linkedListId: lists.linkedListId,
    })
    .from(lists)
    .where(and(eq(lists.userId, userId), takesPartInTrade));
  const named = slug === undefined ? undefined : myLists.find((list) => list.slug === slug);
  return matchSides(myLists, named?.id ?? null, filter);
}

/**
 * The sides' candidates after the ownership check. `ownerIds` narrows them to those accounts,
 * so Browse can count the owners on one page.
 */
export async function recountPartners(
  userId: string,
  sides: Sides,
  filter: TradeFilter,
  options?: CandidateOptions,
) {
  const candidates = await fetchTradeCandidates(userId, sides, filter, options);

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
            listType: lists.listType,
            matchSale: lists.matchSale,
            matchHave: lists.matchHave,
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
  const myWants = new Map<string, MyWant[]>();
  for (const entry of myEntries) {
    if (entry.slug === null) continue;
    if (haveIds.has(entry.listId)) {
      myHaveEntries.push({ listId: entry.listId, slug: entry.slug, objektId: entry.objektId });
      if (entry.listType === "sale") mySaleListIds.add(entry.listId);
    } else {
      const held = myWants.get(entry.slug) ?? [];
      if (!held.some((want) => want.listId === entry.listId)) {
        myWants.set(entry.slug, [
          ...held,
          { listId: entry.listId, matchSale: entry.matchSale, matchHave: entry.matchHave },
        ]);
      }
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
    sale: judge(myHaveEntries.filter((entry) => mySaleListIds.has(entry.listId))),
  };

  return {
    recounted: candidates.map((c) =>
      recount(c, addressesOf.get(c.userId) ?? none, holdings, myWants, myHaves),
    ),
    addressRows,
  };
}

/**
 * The sides Compare with names, or all of the user's lists. Mutual needs both directions, so a
 * list that compares one way reads as all lists there.
 */
export async function resolveCompareSides(
  userId: string,
  slug: string | undefined,
  mutual: boolean,
): Promise<Sides> {
  const sides = await resolveTradeSides(userId, slug, "all");
  const bothWays = sides.haveListIds.length > 0 && sides.wantListIds.length > 0;
  return mutual && !bothWays && sides.listId !== null
    ? resolveTradeSides(userId, undefined, "all")
    : sides;
}

/**
 * Which of `partnerIds` are the user's Mutual people (Can swap on For you) over the lists the
 * alert for `listSlug` opens, `/trade/for-you?match=mutual&list=<listSlug>`, so the alert and the
 * page agree. After the ownership check, read live, never cached: the alert job needs current
 * ownership.
 */
export async function mutualPartnerIds(userId: string, listSlug: string, partnerIds: string[]) {
  if (partnerIds.length === 0) return new Set<string>();
  const sides = await resolveCompareSides(userId, listSlug, true);
  const { recounted } = await recountPartners(userId, sides, "mutual", {
    ownerIds: partnerIds,
    limit: partnerIds.length,
  });
  return new Set(
    recounted
      .filter((partner) => mutualOf(matchCounts(partner)) > 0)
      .map((partner) => partner.userId),
  );
}
