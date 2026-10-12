import { db } from "@repo/db";
import { offer, trade } from "@repo/db/schema";

import { inProgressWhere, needsYouWhere } from "./offer/trades";
import { getTradeMatches, resolveTradeSides } from "./trade-matches";

/**
 * The Trade tab badges. `forYou` is For you's partner count, read only by tabs loaded before
 * the merge; the current tab sends `forYou: false` and gets 0 without running that pipeline.
 */
export async function tabCounts(userId: string, forYou = true) {
  const [partners, needsYou, inProgress] = await Promise.all([
    forYou
      ? resolveTradeSides(userId, undefined, "all")
          .then((sides) => getTradeMatches(userId, sides, "all"))
          .then((matches) => matches.partners.length)
      : 0,
    db.$count(offer, needsYouWhere(userId)),
    db.$count(trade, inProgressWhere(userId)),
  ]);
  return { forYou: partners, mine: needsYou + inProgress };
}
