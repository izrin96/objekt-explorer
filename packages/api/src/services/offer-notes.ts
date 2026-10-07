import { db } from "@repo/db";
import { notification, notificationPref, user, userAddress } from "@repo/db/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { type ChatAddress, chatIdentity } from "../lib/chat-rules";
import type { OfferPayload, TradePayload } from "../schemas/offer";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const unique = <T>(values: T[]) => [...new Set(values)];

type Note =
  | { type: "offer"; userId: string; payload: OfferPayload }
  | { type: "trade"; userId: string; payload: TradePayload };

const groupKeyOf = (note: Note) =>
  note.type === "offer" ? `offer:${note.payload.conversationId}` : `trade:${note.payload.tradeId}`;

/**
 * One unread row per group, holding the latest event; a type the user switched off writes
 * nothing. Shared by the API and the worker, so it imports nothing request-bound.
 */
export async function writeNotes(tx: Tx, notes: Note[]): Promise<string[]> {
  if (notes.length === 0) return [];
  const off = await tx
    .select({ userId: notificationPref.userId, type: notificationPref.type })
    .from(notificationPref)
    .where(
      and(
        inArray(notificationPref.userId, unique(notes.map((note) => note.userId))),
        inArray(notificationPref.type, unique(notes.map((note) => note.type))),
        eq(notificationPref.enabled, false),
      ),
    );
  const muted = new Set(off.map((row) => `${row.userId}:${row.type}`));
  const kept = notes.filter((note) => !muted.has(`${note.userId}:${note.type}`));
  for (const note of kept) {
    await tx
      .insert(notification)
      .values({
        userId: note.userId,
        type: note.type,
        payload: note.payload,
        groupKey: groupKeyOf(note),
      })
      .onConflictDoUpdate({
        target: [notification.userId, notification.groupKey],
        targetWhere: sql`read_at IS NULL`,
        set: { payload: note.payload, createdAt: sql`now()` },
      });
  }
  return unique(kept.map((note) => note.userId));
}

/** Each account as a conversation names it, for notification payloads. */
export async function partyNames(userIds: string[]) {
  const ids = unique(userIds);
  const [users, addresses] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids)),
          db
            .select({
              userId: userAddress.userId,
              address: userAddress.address,
              nickname: userAddress.nickname,
              hideNickname: userAddress.hideNickname,
              hideUser: userAddress.hideUser,
            })
            .from(userAddress)
            .where(inArray(userAddress.userId, ids))
            .orderBy(asc(userAddress.id)),
        ]);
  const addressesOf = new Map<string, ChatAddress[]>();
  for (const { userId, ...info } of addresses) {
    if (userId) addressesOf.set(userId, [...(addressesOf.get(userId) ?? []), info]);
  }
  const names = new Map(
    users.map((u) => [u.id, chatIdentity(u.name, addressesOf.get(u.id) ?? []).name]),
  );
  return (userId: string) => ({ userId, name: names.get(userId) ?? "" });
}
