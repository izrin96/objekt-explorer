import { matchIndexOf, narrowViewer } from "../../lib/trade-feed";
import { matchCounts } from "../../lib/trade-person";
import { mutualPeople } from "../../lib/trade-rank";
import { getCache } from "../redis";
import { countFeedOwners } from "../trade-feed/query";
import { fetchViewer } from "../trade-feed/viewer";
import { recountPartners, resolveCompareSides, type Sides, tradeCacheScope } from "./index";

const COUNT_TTL_SECONDS = 60;
const PEOPLE_TTL_SECONDS = 300;

/**
 * Every Mutual person for the compared sides, best first, past For you's 50-person cap: the
 * ids and ranks Browse's Mutual feed and "Mutual N" read. Cached like For you's matches.
 */
export async function getMutualPeople(userId: string, sides: Sides) {
  const scope = await tradeCacheScope(userId);
  return getCache(
    `trade:mutual-people:3:${userId}:${scope}:${sides.listId ?? "all"}`,
    PEOPLE_TTL_SECONDS,
    async () => {
      const { recounted } = await recountPartners(userId, sides, "mutual");
      return mutualPeople(
        recounted.map((partner) => ({
          userId: partner.userId,
          updatedAt: partner.updatedAt,
          counts: matchCounts(partner),
        })),
      );
    },
  );
}

/**
 * "Mutual N": the Mutual people for the compared lists who have a WTT post Mutual would list,
 * whatever artist or collection filter the viewer set. It reads the people Mutual reads.
 */
export async function mutualCount(userId: string, list: string | undefined) {
  const sides = await resolveCompareSides(userId, list, true);
  if (sides.haveListIds.length === 0 || sides.wantListIds.length === 0) return 0;
  const scope = await tradeCacheScope(userId);
  return getCache(
    `trade:mutual-count:4:${userId}:${scope}:${sides.listId ?? "all"}`,
    COUNT_TTL_SECONDS,
    async () => {
      const [mutual, viewer] = await Promise.all([
        getMutualPeople(userId, sides),
        fetchViewer(userId),
      ]);
      const people = mutual.map((partner) => partner.userId);
      return countFeedOwners(
        {
          viewerId: userId,
          // Mutual lists WTT posts only, so a person with only WTB or WTS posts isn't counted
          type: "wtt",
          slugs: null,
          slug: null,
          matches: matchIndexOf(narrowViewer(viewer, sides)),
        },
        people,
      );
    },
  );
}
