import { tradeVersionKey } from "@repo/lib/server/list-touch";

import { matchCounts } from "../../../lib/trade-person";
import { rankPartners } from "../../../lib/trade-rank";
import { marketVersion } from "../../moderation/safety-cache";
import { getCache, redis, redisFailOpen } from "../../redis";
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

const bySlug = (a: { slug: string }, b: { slug: string }) => a.slug.localeCompare(b.slug);

/**
 * One person's matches with the viewer over all the viewer's lists, by the same rules as For you,
 * however far down the ranking they would sit, each side in slug order. Null with no match;
 * hidden, blocked and sanctioned people fall out of the candidates.
 */
export async function personMatch(userId: string, personId: string) {
  const sides = await resolveCompareSides(userId, undefined, false);
  const scope = await tradeCacheScope(userId);
  return getCache(`trade:person:9:${userId}:${scope}:${personId}`, PERSON_TTL_SECONDS, async () => {
    if (sides.haveListIds.length === 0 && sides.wantListIds.length === 0) return null;
    const { recounted } = await recountPartners(userId, sides, "all", { ownerIds: [personId] });
    const [ranked] = rankPartners(recounted, "all", new Date());
    if (!ranked) return null;
    const { partner } = ranked;
    return {
      counts: matchCounts(partner),
      theyHaveIWant: partner.theyHaveIWant.toSorted(bySlug),
      iHaveTheyWant: partner.iHaveTheyWant.toSorted(bySlug),
    };
  });
}
