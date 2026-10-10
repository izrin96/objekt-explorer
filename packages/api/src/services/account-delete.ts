import { db } from "@repo/db";
import { trade, userSanction } from "@repo/db/schema";
import { APIError } from "better-auth/api";
import { and, eq, or } from "drizzle-orm";

import type { DeleteRefusal } from "../schemas/user";
import { activeSanctionWhere } from "./safety";

export async function hasTradeInProgress(executor: Pick<typeof db, "select">, userId: string) {
  const rows = await executor
    .select({ id: trade.id })
    .from(trade)
    .where(
      and(or(eq(trade.userA, userId), eq(trade.userB, userId)), eq(trade.status, "in_progress")),
    )
    .limit(1);
  return rows.length > 0;
}

export async function deleteRefusal(userId: string): Promise<DeleteRefusal | null> {
  const [sanctions, trading] = await Promise.all([
    db
      .select({ id: userSanction.id })
      .from(userSanction)
      .where(and(eq(userSanction.userId, userId), activeSanctionWhere))
      .limit(1),
    hasTradeInProgress(db, userId),
  ]);
  if (sanctions.length > 0) return "sanctioned";
  if (trading) return "trade_in_progress";
  return null;
}

/** The client words it by `code`. */
export const refusalError = (refusal: DeleteRefusal) =>
  new APIError("BAD_REQUEST", { code: refusal, message: refusal });
