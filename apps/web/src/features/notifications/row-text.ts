import type { Notification, SanctionPayload } from "@repo/api/schemas/notification";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { RowAction } from "./sections";

export type ListNotification = Extract<Notification, { type: "want_match" | "have_wanted" }>;

export const ACTION_LABEL: Record<RowAction, () => string> = {
  send: m.notification_action_send,
  review: m.notification_action_review,
  feedback: m.notification_action_feedback,
  matches: m.notification_action_matches,
};

export function sanctionText(
  { action, reason, endsAt }: SanctionPayload,
  until: (iso: string) => string,
) {
  switch (action) {
    case "warn":
      return m.notification_sanction_warn({ reason });
    case "chat_mute":
      return endsAt
        ? m.notification_sanction_chat_mute({ time: until(endsAt), reason })
        : m.notification_sanction_chat_mute_always({ reason });
    case "trade_block":
      return m.notification_sanction_trade_block({ reason });
    default:
      return null;
  }
}

export function alertText(
  notification: Pick<ListNotification, "type" | "payload">,
  partner: string,
  objektName: (slug: string) => string,
) {
  const { list, count, latest } = notification.payload;
  const first = latest[0];
  if (!first) return null;
  const params = {
    count,
    list: list.name,
    partner,
    objekt: objektName(first.collectionSlug),
  };

  switch (notification.type) {
    case "want_match":
      return count > 1
        ? m.notification_want_match_multiple(params)
        : m.notification_want_match_single(params);
    case "have_wanted":
      return count > 1
        ? m.notification_have_wanted_multiple(params)
        : m.notification_have_wanted_single(params);
    default:
      return null;
  }
}

export function updatesLabel(count: number) {
  return count === 1
    ? m.notification_updates_one()
    : m.notification_updates({ count: count.toLocaleString(getLocale()) });
}
