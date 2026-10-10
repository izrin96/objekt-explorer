import { db } from "@repo/db";
import { offer, trade } from "@repo/db/schema";

import { inProgressWhere, needsYouWhere } from "./offer/trades";
import { getTradeMatches, resolveTradeSides } from "./trade-matches";

/** The Trade tab badges: For you reads the same cache entry as its default load. */
export async function tabCounts(userId: string) {
  const [matches, needsYou, inProgress] = await Promise.all([
    resolveTradeSides(userId, undefined, "all").then((sides) =>
      getTradeMatches(userId, sides, "all"),
    ),
    db.$count(offer, needsYouWhere(userId)),
    db.$count(trade, inProgressWhere(userId)),
  ]);
  return { forYou: matches.partners.length, mine: needsYou + inProgress };
}
