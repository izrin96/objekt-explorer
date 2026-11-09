import type { Tx } from "@repo/db";
import { trade, tradeLeg } from "@repo/db/schema";
import { eq, sql } from "drizzle-orm";

import type { TradeStatus } from "../../schemas/offer";

/**
 * Locks the trade row and returns its status, null for no such trade. The verifier settles under
 * this same lock, so a write that takes it first sees every leg the verifier already closed.
 */
export async function lockTradeRow(tx: Tx, tradeId: number): Promise<TradeStatus | null> {
  const [locked] = await tx
    .select({ status: sql<TradeStatus>`${trade.status}` })
    .from(trade)
    .where(eq(trade.id, tradeId))
    .for("update");
  return locked?.status ?? null;
}

export const progressColumns = {
  total: sql<number>`count(*)::int`,
  verified: sql<number>`(count(*) FILTER (WHERE ${tradeLeg.verifiedAt} IS NOT NULL))::int`,
};

export const countVerified = (tx: Tx, tradeId: number) =>
  tx
    .select(progressColumns)
    .from(tradeLeg)
    .where(eq(tradeLeg.tradeId, tradeId))
    .then((rows) => rows[0] ?? { total: 0, verified: 0 });
