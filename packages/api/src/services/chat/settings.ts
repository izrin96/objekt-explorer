import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { conversationMember, messagePref, userAddress } from "@repo/db/schema";
import { and, eq, inArray } from "drizzle-orm";

import { type MessagePref, showsActivityTo, toMessagePref } from "../../lib/chat-rules";
import { MESSAGE_PREF_DEFAULTS, type MessageSettings } from "../../schemas/chat";
import { loadIdentities } from "../identities";

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

/**
 * For one conversation: whether the partner's Seen and typing reach the viewer, whether the
 * viewer's reach the partner, and how far the partner has read.
 */
export async function activityBetween(conversationId: number, viewerId: string, partnerId: string) {
  const [members, shows] = await Promise.all([
    db
      .select({
        userId: conversationMember.userId,
        request: conversationMember.request,
        lastReadMessageId: conversationMember.lastReadMessageId,
      })
      .from(conversationMember)
      .where(eq(conversationMember.conversationId, conversationId)),
    showsActivity([viewerId, partnerId]),
  ]);
  const viewer = members.find((member) => member.userId === viewerId);
  const partner = members.find((member) => member.userId === partnerId);
  return {
    toViewer: showsActivityTo({
      shownShows: shows(partnerId),
      viewerShows: shows(viewerId),
      shownRequest: partner?.request ?? true,
    }),
    toPartner: showsActivityTo({
      shownShows: shows(viewerId),
      viewerShows: shows(partnerId),
      shownRequest: viewer?.request ?? true,
    }),
    partnerReadMessageId: partner?.lastReadMessageId ?? null,
  };
}

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
      if (linked === 0) throw new ORPCError("BAD_REQUEST", { message: "Not your profile" });
    }
    set.chatAs = chatAs;
  }
  if (Object.keys(set).length > 0) {
    await db
      .insert(messagePref)
      .values({ userId, ...MESSAGE_PREF_DEFAULTS, ...set })
      .onConflictDoUpdate({ target: messagePref.userId, set });
  }
  return fetchSettings(userId);
}
