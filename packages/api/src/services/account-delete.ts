import { db } from "@repo/db";
import { trade, tradeLeg, userSanction } from "@repo/db/schema";
import { APIError } from "better-auth/api";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";

import {
  type DeletionSanction,
  type DeletionTrade,
  deletionBlockers,
  refusalOf,
} from "../lib/account-deletion";
import type { DeleteRefusal } from "../schemas/user";
import type { Tx } from "./offer/core";
import { heldCopies } from "./trade-verify";

/** The trades and sanctions `deletionBlockers` decides on, read through `db` or a transaction. */
export async function deletionState(executor: Tx | typeof db, userId: string) {
  const trades = await executor
    .select({
      id: trade.id,
      userA: trade.userA,
      userB: trade.userB,
      status: trade.status,
      acceptedAt: trade.acceptedAt,
      endedAt: trade.endedAt,
      verifiedLegs: sql<number>`(
        SELECT count(*)::int FROM ${tradeLeg}
        WHERE ${tradeLeg.tradeId} = ${trade.id} AND ${tradeLeg.verifiedAt} IS NOT NULL
      )`,
    })
    .from(trade)
    .where(
      and(or(eq(trade.userA, userId), eq(trade.userB, userId)), eq(trade.status, "in_progress")),
    );
  const sanctions = await executor
    .select({
      type: userSanction.type,
      expiresAt: userSanction.expiresAt,
      revokedAt: userSanction.revokedAt,
    })
    .from(userSanction)
    .where(
      and(
        eq(userSanction.userId, userId),
        ne(userSanction.type, "warn"),
        isNull(userSanction.revokedAt),
      ),
    );
  const held: number[] = [];
  for (const row of trades) held.push(await heldCopies(executor, row.id));
  return {
    trades: trades.map((row, i): DeletionTrade => ({
      id: row.id,
      partnerId: row.userA === userId ? row.userB : row.userA,
      status: row.status,
      acceptedAt: new Date(row.acceptedAt),
      endedAt: row.endedAt === null ? null : new Date(row.endedAt),
      verifiedLegs: row.verifiedLegs,
      heldCopies: held[i]!,
    })),
    sanctions: sanctions.map((row): DeletionSanction => ({
      type: row.type,
      expiresAt: row.expiresAt === null ? null : new Date(row.expiresAt),
      revokedAt: row.revokedAt === null ? null : new Date(row.revokedAt),
    })),
  };
}

export async function deleteRefusal(userId: string): Promise<DeleteRefusal | null> {
  const state = await deletionState(db, userId);
  return refusalOf(deletionBlockers({ ...state, now: new Date() }));
}

/** The client words it by `code`. */
export const refusalError = (refusal: DeleteRefusal) =>
  new APIError("BAD_REQUEST", { code: refusal, message: refusal });
