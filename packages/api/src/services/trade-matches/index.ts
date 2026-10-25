import { db } from "@repo/db";
import { lists, messagePref, user } from "@repo/db/schema";
import { tradeVersionKey } from "@repo/lib/server/list-touch";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { and, eq, inArray, sql } from "drizzle-orm";

import { isMessageable, toMessagePref } from "../../lib/chat-rules";
import { matchCounts } from "../../lib/trade-person";
import { rankPartners, toPartnerIdentity, nicknamesByAddress } from "../../lib/trade-rank";
import { unique } from "../../lib/unique";
import { CARD_LIMIT } from "../../schemas/trade";
import { fetchCollectionsBySlug } from "../list";
import { toPublicUser } from "../profile";
import { getCache, redis, redisFailOpen } from "../redis";
import { reputationOf } from "../reputation";
import { notBlockedEither, notTradeSanctioned } from "../safety";
import { marketVersion } from "../safety-cache";
import { fetchAddresses } from "./holdings";
import { recountPartners, resolveCompareSides, resolveTradeSides, type Sides } from "./recount";

export { recountPartners, resolveCompareSides, resolveTradeSides, type Sides };

/** What a viewer's trade caches depend on: their own list version and the market's. */
export async function tradeCacheScope(userId: string) {
  const [version, market] = await Promise.all([
    redisFailOpen("trade version", () => redis.get(tradeVersionKey(userId))).then((v) => v ?? "0"),
    marketVersion(),
  ]);
  return `${version}:${market}`;
}

const PERSON_TTL_SECONDS = 60;

type Partners = Awaited<ReturnType<typeof hydratePartners>>["partners"];

/** Read past the matches cache, so a partner's Messages setting applies on the next load. */
export async function withMessageable<M extends { partners: Partners }>(matches: M) {
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
export async function withReputation<M extends { partners: Partners }>(matches: M) {
  const reputations = await reputationOf(matches.partners.map((partner) => partner.userId));
  return {
    ...matches,
    partners: matches.partners.map((partner) =>
      Object.assign(partner, { reputation: reputations.get(partner.userId) ?? null }),
    ),
  };
}

type Ranked = ReturnType<
  typeof rankPartners<Awaited<ReturnType<typeof recountPartners>>["recounted"][number]>
>;
type AddressRows = Awaited<ReturnType<typeof recountPartners>>["addressRows"];

/** Users, partner lists, drawn collections and identity for ranked partners. */
async function hydratePartners(ranked: Ranked, addressRows: AddressRows) {
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
            listType: lists.listType,
            matchSale: lists.matchSale,
            matchHave: lists.matchHave,
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
        listType: list.listType,
        matchSale: list.matchSale,
        matchHave: list.matchHave,
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
        counts: matchCounts(partner),
        lists: ownLists.toSorted((a, b) => b.matches - a.matches),
        theyHaveIWant: partner.theyHaveIWant.toSorted(bySlug),
        iHaveTheyWant: partner.iHaveTheyWant.toSorted(bySlug),
        dropped: partner.dropped.toSorted(bySlug),
      },
    ];
  });

  return {
    partners,
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c])) as Record<
      string,
      ValidObjekt
    >,
  };
}

/**
 * One person's matches with the viewer, by the same rules as For you, however far down the
 * ranking they would sit. Hidden, blocked and sanctioned people fall out of the candidates.
 */
export async function personDetail(userId: string, personId: string, list: string | undefined) {
  const sides = await resolveCompareSides(userId, list, false);
  const scope = await tradeCacheScope(userId);
  const detail = await getCache(
    `trade:person:7:${userId}:${scope}:${sides.listId ?? "all"}:${personId}`,
    PERSON_TTL_SECONDS,
    async () => {
      const now = new Date();
      if (sides.haveListIds.length === 0 && sides.wantListIds.length === 0) {
        return { checkedAt: now.toISOString(), partners: [], collections: {} };
      }
      const { recounted, addressRows } = await recountPartners(userId, sides, "all", {
        ownerIds: [personId],
      });
      const hydrated = await hydratePartners(rankPartners(recounted, "all", now), addressRows);
      return { checkedAt: now.toISOString(), ...hydrated };
    },
  );
  const { partners, collections, checkedAt } = await withReputation(await withMessageable(detail));
  const partner = partners[0] ?? null;
  return {
    partner,
    header: partner ? null : await personHeader(userId, personId),
    collections,
    checkedAt,
  };
}

/**
 * Who a person with no matches is, for the sheet's title and header. An account either side
 * has blocked, or with a trade sanction, gets none: the sheet then says only that nothing matches.
 */
async function personHeader(viewerId: string, personId: string) {
  const [account] = await db
    .select()
    .from(user)
    .where(
      and(
        eq(user.id, personId),
        notBlockedEither(viewerId, sql`${user.id}`),
        notTradeSanctioned(sql`${user.id}`),
      ),
    );
  if (!account) return null;
  const [reputations, addressRows] = await Promise.all([
    reputationOf([personId]),
    fetchAddresses([personId]),
  ]);
  return {
    userId: account.id,
    user: toPublicUser(account),
    identity: toPartnerIdentity(account.name, [], addressRows),
    reputation: reputations.get(personId) ?? null,
  };
}

const bySlug = (a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug);
