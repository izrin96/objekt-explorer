import { FEED_CANDIDATE_LIMIT, oneWayPeople, toRanked } from "../../lib/trade-rank";
import { getCache } from "../redis";
import { recountPartners, type Sides, tradeCacheScope } from "./index";

const PEOPLE_TTL_SECONDS = 300;

/**
 * Everyone who matches the viewer in either direction for the compared sides, most matches
 * first: the ranking For you's One way section pages by. Cached like `getMutualPeople`, under
 * its own key since the filter differs.
 */
export async function getOneWayPeople(userId: string, sides: Sides) {
  const scope = await tradeCacheScope(userId);
  return getCache(
    `trade:oneway-people:5:${userId}:${scope}:${sides.listId ?? "all"}`,
    PEOPLE_TTL_SECONDS,
    async () => {
      const { recounted } = await recountPartners(userId, sides, "all", {
        limit: FEED_CANDIDATE_LIMIT,
        order: "sum",
      });
      return oneWayPeople(recounted.map(toRanked));
    },
  );
}
