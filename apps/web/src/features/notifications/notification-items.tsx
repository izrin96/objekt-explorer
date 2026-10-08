import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  type Icon,
  PackageIcon,
  ShieldWarningIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import type { Notification } from "@repo/api/schemas/notification";
import { Link } from "@tanstack/react-router";

import { untilLabel } from "@/features/chat/format";
import { collectionName } from "@/features/objekt/objekt-label";
import { offerNotificationText, tradeNotificationText } from "@/features/offers/format";
import { relativeTime } from "@/lib/time";
import { TONE_FILL, TONE_INK, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type NotificationIcon, notificationTone } from "./tone";

export type Collections = Outputs["notifications"]["list"]["collections"];

const TONE_ICON: Record<NotificationIcon, Icon> = {
  check: CheckIcon,
  clock: ClockIcon,
  cross: XIcon,
  arrow: ArrowRightIcon,
  heart: HeartIcon,
  package: PackageIcon,
  shield: ShieldWarningIcon,
  warning: WarningIcon,
};

/** An alert's objekt thumbnail keeps its picture, framed in its list type's colour. */
const TONE_FRAME: Partial<Record<Tone, string>> = {
  want: "outline-type-want",
  have: "outline-type-have",
};

function ToneTile({ notification }: { notification: Notification }) {
  const { icon, tone } = notificationTone(notification);
  const Glyph = TONE_ICON[icon];
  return (
    <span
      className={cn(
        "grid h-10 w-7 shrink-0 place-items-center rounded",
        TONE_FILL[tone],
        TONE_INK[tone],
      )}
    >
      <Glyph aria-hidden weight="bold" className="size-4" />
    </span>
  );
}

function UnreadMark() {
  return (
    <span className="mt-1.5 flex size-2 shrink-0">
      <span className="bg-accent-solid size-full rounded-full" />
      <span className="sr-only">{m.notification_unread()}</span>
    </span>
  );
}

function ItemTime({ createdAt, now }: { createdAt: string; now: number }) {
  return (
    <time dateTime={createdAt} className="text-muted-foreground text-xs">
      {relativeTime(new Date(createdAt).getTime(), now)}
    </time>
  );
}

type ListNotification = Extract<Notification, { type: "want_match" | "have_wanted" }>;
type OfferNotification = Extract<Notification, { type: "offer" | "trade" }>;
type SanctionNotification = Extract<Notification, { type: "sanction" }>;

function sanctionText({ action, reason, endsAt }: SanctionNotification["payload"]) {
  switch (action) {
    case "warn":
      return m.notification_sanction_warn({ reason });
    case "chat_mute":
      return endsAt
        ? m.notification_sanction_chat_mute({ time: untilLabel(endsAt), reason })
        : m.notification_sanction_chat_mute_always({ reason });
    case "trade_block":
      return m.notification_sanction_trade_block({ reason });
    default:
      return null;
  }
}

/** A notice from moderators: it leads nowhere, so activating it only marks it read. */
export function SanctionItem({
  notification,
  now,
  onRead,
}: {
  notification: SanctionNotification;
  now: number;
  onRead: () => void;
}) {
  const text = sanctionText(notification.payload);
  if (text === null) return null;
  const unread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={onRead}
      className="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex w-full items-start gap-3 px-4 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      <ToneTile notification={notification} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-muted-foreground text-xs font-medium">
          {m.notification_sanction_from()}
        </span>
        <span
          className={cn(
            "text-sm text-pretty break-words",
            unread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {text}
        </span>
        <ItemTime createdAt={notification.createdAt} now={now} />
      </span>
      {unread ? <UnreadMark /> : null}
    </button>
  );
}

/** Offers and trades: to the trade once there is one, else to the conversation. */
export function OfferItem({
  notification,
  now,
  onOpen,
}: {
  notification: OfferNotification;
  now: number;
  onOpen: () => void;
}) {
  const { payload } = notification;
  const unread = notification.readAt === null;
  const className =
    "hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex items-start gap-3 px-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset";
  const body = (
    <>
      <ToneTile notification={notification} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm text-pretty break-words",
            unread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {notification.type === "trade"
            ? tradeNotificationText(notification.payload)
            : offerNotificationText(notification.payload)}
        </span>
        <ItemTime createdAt={notification.createdAt} now={now} />
      </span>
      {unread ? <UnreadMark /> : null}
    </>
  );

  return payload.tradeId !== null ? (
    <Link
      to="/trade/mine/$tradeId"
      params={{ tradeId: String(payload.tradeId) }}
      onClick={onOpen}
      className={className}
    >
      {body}
    </Link>
  ) : (
    <Link
      to="/messages/$id"
      params={{ id: String(payload.conversationId) }}
      onClick={onOpen}
      className={className}
    >
      {body}
    </Link>
  );
}

export function NotificationItem({
  notification,
  collections,
  now,
  onOpen,
}: {
  notification: ListNotification;
  collections: Collections;
  now: number;
  onOpen: () => void;
}) {
  const text = notificationText(notification, collections);
  // an older tab skips a type a newer server sends
  if (text === null) return null;

  const latest = notification.payload.latest[0];
  const thumbnail = latest ? collections[latest.collectionSlug]?.thumbnailImage : undefined;
  const unread = notification.readAt === null;

  return (
    <Link
      to="/trade/for-you"
      search={{ list: notification.payload.list.slug }}
      onClick={onOpen}
      className="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex items-start gap-3 px-4 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-inset"
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt=""
          className={cn(
            "h-10 w-7 shrink-0 rounded object-cover outline-2 outline-offset-1",
            TONE_FRAME[notificationTone(notification).tone],
          )}
        />
      ) : (
        <ToneTile notification={notification} />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm text-pretty",
            unread ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {text}
        </span>
        <ItemTime createdAt={notification.createdAt} now={now} />
      </span>
      {unread ? <UnreadMark /> : null}
    </Link>
  );
}

function notificationText(notification: ListNotification, collections: Collections) {
  const { list, count, latest } = notification.payload;
  const first = latest[0];
  if (!first) return null;
  const params = {
    count,
    list: list.name,
    partner: first.partnerName,
    objekt: collectionName(first.collectionSlug, collections[first.collectionSlug]),
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
