import { db } from "@repo/db";
import { indexer } from "@repo/db/indexer";
import {
  hiddenTradePartner,
  listEntries,
  lists,
  messagePref,
  user,
  userAddress,
  userBlock,
} from "@repo/db/schema";
import { tradeVersionKey } from "@repo/lib/server/list-touch";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, or, sql } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../lib/chat-rules";
import {
  CANDIDATE_LIMIT,
  type Candidate,
  collectionVerdict,
  copyKey,
  countDropped,
  groupBySlug,
  type Holdings,
  matchSides,
  type OwnedEntry,
  rankPartners,
  recount,
  toPartnerIdentity,
  addressesByUser,
  nicknamesByAddress,
} from "../lib/trade-rank";
import { CARD_LIMIT, type TradeFilter } from "../schemas/trade";
import { fetchCollectionsBySlug } from "./list";
import { toPublicUser } from "./profile";
import { getCache, redis } from "./redis";
import { reputationOf } from "./reputation";
import { notBlockedEither, notTradeSanctioned } from "./safety";
import { marketVersion } from "./safety-cache";
import { takesPartInTrade, takesPartInTradeSql } from "./trade-lists";

const HAVING: Record<TradeFilter, ReturnType<typeof sql>> = {
  all: sql``,
  mutual: sql`HAVING count(*) FILTER (WHERE they_have) > 0 AND count(*) FILTER (WHERE NOT they_have) > 0`,
  they_have: sql`HAVING count(*) FILTER (WHERE they_have) > 0`,
  they_want: sql`HAVING count(*) FILTER (WHERE NOT they_have) > 0`,
};

const ORDER: Record<TradeFilter, ReturnType<typeof sql>> = {
  all: sql`least(a, b) DESC, a + b DESC`,
  mutual: sql`least(a, b) DESC, a + b DESC`,
  they_have: sql`a DESC`,
  they_want: sql`b DESC`,
};

type CandidateRow = {
  user_id: string;
  list_updated_at: Record<string, string>;
  they_have: [number, string, string | null][];
  they_want: [number, string][];
};

/**
 * Aggregated and pre-ranked in SQL, so a large want list never ships its rows to Node;
 * ownership is checked afterwards, on these candidates only.
 */
async function fetchTradeCandidates(
  userId: string,
  sides: { haveListIds: number[]; wantListIds: number[] },
  filter: TradeFilter,
): Promise<Candidate[]> {
  const result = await db.execute<CandidateRow>(sql`
    WITH my_want AS (
      SELECT DISTINCT collection_slug FROM list_entries
      WHERE list_id = ANY(${sql.param(sides.wantListIds)}::int[]) AND collection_slug IS NOT NULL
    ),
    my_have AS (
      SELECT DISTINCT collection_slug FROM list_entries
      WHERE list_id = ANY(${sql.param(sides.haveListIds)}::int[]) AND collection_slug IS NOT NULL
    ),
    partner_lists AS (
      SELECT l.id, l.user_id, l.list_type_new, l.updated_at FROM lists l
      WHERE l.discoverable
        AND ${takesPartInTradeSql("l")}
        AND l.user_id <> ${userId}
        AND NOT EXISTS (
          SELECT 1 FROM hidden_trade_partner h
          WHERE h.user_id = ${userId} AND h.hidden_user_id = l.user_id
        )
        AND ${notBlockedEither(userId, sql`l.user_id`)}
        AND ${notTradeSanctioned(sql`l.user_id`)}
    ),
    matched AS (
      SELECT p.user_id, p.id AS list_id, p.updated_at, true AS they_have, e.collection_slug, e.objekt_id
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_want w ON w.collection_slug = e.collection_slug
      WHERE p.list_type_new IN ('have', 'sale')
      UNION ALL
      SELECT p.user_id, p.id, p.updated_at, false, e.collection_slug, NULL
      FROM partner_lists p
      JOIN list_entries e ON e.list_id = p.id
      JOIN my_have h ON h.collection_slug = e.collection_slug
      WHERE p.list_type_new = 'want'
    ),
    grouped AS (
      SELECT
        user_id,
        count(DISTINCT collection_slug) FILTER (WHERE they_have) AS a,
        count(DISTINCT collection_slug) FILTER (WHERE NOT they_have) AS b,
        coalesce(
          json_agg(json_build_array(list_id, collection_slug, objekt_id)) FILTER (WHERE they_have),
          '[]'
        ) AS they_have,
        coalesce(
          json_agg(DISTINCT jsonb_build_array(list_id, collection_slug)) FILTER (WHERE NOT they_have),
          '[]'
        ) AS they_want,
        max(updated_at) AS updated_at,
        jsonb_object_agg(list_id, updated_at) AS list_updated_at
      FROM matched
      GROUP BY user_id
      ${HAVING[filter]}
    )
    SELECT user_id, list_updated_at, they_have, they_want FROM grouped
    ORDER BY ${ORDER[filter]}, updated_at DESC, user_id
    LIMIT ${CANDIDATE_LIMIT}
  `);

  return result.rows.map((row) => ({
    userId: row.user_id,
    listUpdatedAt: Object.fromEntries(
      Object.entries(row.list_updated_at).map(([id, at]) => [id, new Date(at).toISOString()]),
    ),
    theyHave: row.they_have.map(([listId, slug, objektId]) => ({ listId, slug, objektId })),
    theyWant: row.they_want.map(([listId, slug]) => ({ listId, slug })),
  }));
}

type Sides = ReturnType<typeof matchSides>;

/**
 * The user's bound have and sale lists and their want lists, narrowed by `slug` when it names
 * one of them. A have or sale list counts only while bound to a profile.
 */
export async function resolveTradeSides(userId: string, slug: string | undefined): Promise<Sides> {
  const myLists = await db
    .select({ id: lists.id, slug: lists.slug, listTypeNew: lists.listTypeNew })
    .from(lists)
    .where(and(eq(lists.userId, userId), takesPartInTrade));
  const named = slug === undefined ? undefined : myLists.find((list) => list.slug === slug);
  return matchSides(myLists, named?.id ?? null);
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

const unique = <T>(values: T[]) => [...new Set(values)];

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
          })
          .from(listEntries)
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
    db
      .select({
        userId: userAddress.userId,
        address: userAddress.address,
        nickname: userAddress.nickname,
      })
      .from(userAddress)
      .where(inArray(userAddress.userId, [userId, ...partnerIds])),
  ]);

  const addressesOf = addressesByUser(addressRows);
  const none = new Set<string>();

  const haveIds = new Set(sides.haveListIds);
  const myHaveEntries: OwnedEntry[] = [];
  const myWants = new Map<string, number[]>();
  for (const entry of myEntries) {
    if (entry.slug === null) continue;
    if (haveIds.has(entry.listId)) {
      myHaveEntries.push({ listId: entry.listId, slug: entry.slug, objektId: entry.objektId });
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
  const myHaves = new Map(
    [...groupBySlug(myHaveEntries)].map(([slug, entries]) => [
      slug,
      collectionVerdict(entries, myAddresses, holdings),
    ]),
  );

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
  const drawn = unique(
    ranked.flatMap(({ partner }) => [
      ...partner.theyHaveIWant.slice(0, CARD_LIMIT).map((m) => m.slug),
      ...partner.iHaveTheyWant.slice(0, CARD_LIMIT).map((m) => m.slug),
      ...partner.dropped.slice(0, CARD_LIMIT).map((d) => d.slug),
    ]),
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

type HoldingRow = { owner: string; key: string; transferable: boolean; token: boolean };

/** Restricted to the matched collections, so no wallet is scanned whole. */
export async function fetchHoldings(
  tokenIds: string[],
  slugs: string[],
  owners: string[],
): Promise<Holdings> {
  const objekts = new Map<string, { owner: string; transferable: boolean }>();
  const copies = new Map<string, boolean>();
  if (tokenIds.length === 0 && (slugs.length === 0 || owners.length === 0)) {
    return { objekts, copies };
  }

  const result = await indexer.execute<HoldingRow>(sql`
    SELECT o.owner, c.slug AS key, bool_or(o.transferable) AS transferable, false AS token
    FROM collection c
    JOIN objekt o ON o.collection_id = c.id
    WHERE c.slug = ANY(${sql.param(slugs)}::text[]) AND o.owner = ANY(${sql.param(owners)}::text[])
    GROUP BY o.owner, c.slug
    UNION ALL
    SELECT owner, id, transferable, true FROM objekt
    WHERE id = ANY(${sql.param(tokenIds)}::varchar[])
  `);

  for (const row of result.rows) {
    const owner = row.owner.toLowerCase();
    if (row.token) objekts.set(row.key, { owner, transferable: row.transferable });
    else copies.set(copyKey(owner, row.key), row.transferable);
  }
  return { objekts, copies };
}
