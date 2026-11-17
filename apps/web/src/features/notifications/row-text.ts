import type {
  CosmoSessionExpiryPayload,
  Notification,
  SanctionPayload,
} from "@repo/api/schemas/notification";

import { expiryNotice } from "@/features/cosmo-session/connect-flow";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

import type { RowAction } from "./sections";

export type ListNotification = Extract<Notification, { type: "want_match" | "have_wanted" }>;

export const ACTION_LABEL: Record<RowAction, () => string> = {
  send: m.notification_action_send,
  review: m.notification_action_review,
  feedback: m.notification_action_feedback,
  matches: m.notification_action_matches,
  renew: m.cosmo_session_renew,
};

export function sanctionText(
  { action, reason, endsAt, profile }: SanctionPayload,
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
    case "banner_remove":
      return profile
        ? m.notification_sanction_banner_remove({
            profile: profile.nickname ?? profile.address,
            reason,
          })
        : null;
    case "chat_mute_lifted":
      return m.notification_sanction_chat_mute_lifted();
    case "trade_block_lifted":
      return m.notification_sanction_trade_block_lifted();
    default:
      return null;
  }
}

/**
 * Whole days from the notice's own time to the session's end, so an old notice stays true as of
 * then; null when the window doesn't hold, which this tab then doesn't draw.
 */
export function expiryText({ expiresAt }: CosmoSessionExpiryPayload, createdAt: string) {
  const days = expiryNotice(Date.parse(expiresAt), Date.parse(createdAt));
  if (days === null) return null;
  if (days === 0) return m.notification_cosmo_expiry_today();
  if (days === 1) return m.notification_cosmo_expiry_one_day();
  return m.notification_cosmo_expiry_days({ count: formatCount(days) });
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
    : m.notification_updates({ count: formatCount(count) });
}
