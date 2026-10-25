import { db } from "@repo/db";
import { offer, trade } from "@repo/db/schema";

import { inProgressWhere, needsYouWhere } from "./offer/trades";

/** The Trade tab badge: offers to answer plus trades in progress. */
export async function tabCounts(userId: string) {
  const [needsYou, inProgress] = await Promise.all([
    db.$count(offer, needsYouWhere(userId)),
    db.$count(trade, inProgressWhere(userId)),
  ]);
  return { mine: needsYou + inProgress };
}
