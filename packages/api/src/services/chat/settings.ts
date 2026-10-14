import { db } from "@repo/db";
import { conversationMember, messagePref, userAddress } from "@repo/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { type MessagePref, showsActivityTo, toMessagePref } from "../../lib/chat-rules";
import { MESSAGE_PREF_DEFAULTS, type MessageSettings } from "../../schemas/chat";
import { loadIdentities } from "../identities";
import { redis } from "../redis";
import { notBlockedEither } from "../safety";
import { refuse } from "./refuse";

export async function fetchPref(userId: string): Promise<MessagePref> {
  const [row] = await db
    .select({ allow: messagePref.allow })
    .from(messagePref)
    .where(eq(messagePref.userId, userId));
  return toMessagePref(row);
}

/** Whether each account shows Seen and typing; on unless it turned the switch off. */
export async function showsActivity(userIds: string[]) {
  const rows =
    userIds.length === 0
      ? []
      : await db
          .select({ userId: messagePref.userId })
          .from(messagePref)
          .where(and(inArray(messagePref.userId, userIds), eq(messagePref.showActivity, false)));
  const off = new Set(rows.map((row) => row.userId));
  return (userId: string) => !off.has(userId);
}

/** The settings as the account sees them, with Chat as resolved to what partners see. */
export async function fetchSettings(userId: string): Promise<MessageSettings> {
  const [pref, identities, activity] = await Promise.all([
    fetchPref(userId),
    loadIdentities([userId]),
    showsActivity([userId]),
  ]);
  return {
    ...pref,
    chatAs: identities.get(userId)?.identity.address ?? null,
    showActivity: activity(userId),
  };
}

async function blockedBetween(a: string, b: string) {
  const result = await db.execute<{ blocked: boolean }>(
    sql`SELECT NOT ${notBlockedEither(a, b)} AS blocked`,
  );
  return result.rows[0]?.blocked ?? false;
}

/**
 * For one conversation: whether the partner's Seen and typing reach the viewer, whether the
 * viewer's reach the partner, and how far the partner has read. A block between the two
 * hides both ways; a caller that already read `chatSafety` passes its `blockedEitherWay`.
 */
export async function activityBetween(
  conversationId: number,
  viewerId: string,
  partnerId: string,
  blockedEitherWay?: boolean,
) {
  const [members, shows, blocked] = await Promise.all([
    db
      .select({
        userId: conversationMember.userId,
        request: conversationMember.request,
        lastReadMessageId: conversationMember.lastReadMessageId,
      })
      .from(conversationMember)
      .where(eq(conversationMember.conversationId, conversationId)),
    showsActivity([viewerId, partnerId]),
    blockedEitherWay ?? blockedBetween(viewerId, partnerId),
  ]);
  const viewer = members.find((member) => member.userId === viewerId);
  const partnerMember = members.find((member) => member.userId === partnerId);
  return {
    toViewer:
      !blocked &&
      showsActivityTo({
        shownShows: shows(partnerId),
        viewerShows: shows(viewerId),
        shownRequest: partnerMember?.request ?? true,
      }),
    toPartner:
      !blocked &&
      showsActivityTo({
        shownShows: shows(viewerId),
        viewerShows: shows(partnerId),
        shownRequest: viewer?.request ?? true,
      }),
    partnerReadMessageId: partnerMember?.lastReadMessageId ?? null,
  };
}

/** One Show Seen and typing change per account in this many seconds. */
const ACTIVITY_CHANGE_SECONDS = 10;

/** Saves what the input names; Chat as must be one of the account's linked addresses. */
export async function saveSettings(userId: string, input: Partial<MessageSettings>) {
  const set: Partial<MessageSettings> = {};
  if (input.allow !== undefined) set.allow = input.allow;
  if (input.showActivity !== undefined) set.showActivity = input.showActivity;
  if (input.chatAs !== undefined) {
    const chatAs = input.chatAs?.toLowerCase() ?? null;
    if (chatAs !== null) {
      const linked = await db.$count(
        userAddress,
        and(eq(userAddress.address, chatAs), eq(userAddress.userId, userId)),
      );
      if (linked === 0) refuse("not_own_profile");
    }
    set.chatAs = chatAs;
  }
  // after every refusal above, so a refused request never uses up the window
  const before = (await showsActivity([userId]))(userId);
  const activityChanged = input.showActivity !== undefined && input.showActivity !== before;
  if (activityChanged) {
    const key = `chat:activity-change:${userId}`;
    const taken = await redis.send("SET", [key, "1", "NX", "EX", String(ACTIVITY_CHANGE_SECONDS)]);
    if (taken === null) {
      const ttl = Number(await redis.send("PTTL", [key]));
      refuse(
        "settings_limit",
        new Date(Date.now() + (ttl > 0 ? ttl : ACTIVITY_CHANGE_SECONDS * 1000)),
      );
    }
  }
  if (Object.keys(set).length > 0) {
    await db
      .insert(messagePref)
      .values({ userId, ...MESSAGE_PREF_DEFAULTS, ...set })
      .onConflictDoUpdate({ target: messagePref.userId, set });
  }
  return { saved: await fetchSettings(userId), activityChanged };
}
