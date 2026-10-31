import { CaretDownIcon } from "@phosphor-icons/react";
import type { NoteEvent, Notification } from "@repo/api/schemas/notification";
import { Link, linkOptions } from "@tanstack/react-router";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { untilLabel } from "@/features/chat/format";
import { collectionName } from "@/features/objekt/objekt-label";
import {
  offerNo,
  offerNotificationText,
  tradeNo,
  tradeNotificationText,
} from "@/features/offers/format";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { PARTNER_TOKEN } from "./headline";
import {
  ActionLabel,
  Headline,
  ItemTime,
  ObjektLine,
  Progress,
  RefChip,
  RowBody,
  type RowVariant,
} from "./row-body";
import { NotificationStack, PartnerAvatar, TONE_FRAME, ToneTile } from "./row-lead";
import { alertText, type ListNotification, sanctionText, updatesLabel } from "./row-text";
import { rowAction } from "./sections";
import { type Collections, sameSlugs, shownSlugs } from "./stack";
import { notificationTone } from "./tone";

const ROW =
  "hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring relative flex items-start gap-3 py-2.5 ps-5 pe-4 outline-none focus-visible:ring-2 focus-visible:ring-inset";

type OfferNotification = Extract<Notification, { type: "offer" | "trade" }>;
type SanctionNotification = Extract<Notification, { type: "sanction" }>;

type RowProps<N> = {
  notification: N;
  collections: Collections;
  now: number;
  onOpen: () => void;
  variant: RowVariant;
};

const rowTone = (unread: boolean) => (unread ? "bg-muted/60" : undefined);
const rowClass = (unread: boolean, variant: RowVariant) =>
  cn(ROW, rowTone(unread), variant === "sheet" && "min-h-16");

/** A notice from moderators: it leads nowhere, so activating it only marks it read. */
function SanctionItem({ notification, now, onOpen, variant }: RowProps<SanctionNotification>) {
  const text = sanctionText(notification.payload, untilLabel);
  if (text === null) return null;
  const unread = notification.readAt === null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(rowClass(unread, variant), "w-full text-start")}
    >
      <RowBody
        lead={<ToneTile icon="shield" />}
        headline={
          <span className="flex flex-col gap-0.5">
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
          </span>
        }
        createdAt={notification.createdAt}
        now={now}
        unread={unread}
        variant={variant}
      />
    </button>
  );
}

function eventText(note: NoteEvent, partner: string) {
  return note.type === "trade"
    ? tradeNotificationText(note.payload, partner)
    : offerNotificationText(note.payload, partner);
}

/** Offers and trades: to the trade once there is one, else to the conversation. */
function OfferItem({
  notification,
  collections,
  now,
  onOpen,
  variant,
}: RowProps<OfferNotification>) {
  const [expanded, setExpanded] = useState(false);
  const earlierId = useId();
  const { payload } = notification;
  const unread = notification.readAt === null;
  const { icon } = notificationTone(notification);
  const slugs = shownSlugs(notification, collections);
  const action = rowAction(notification);
  const earlier = notification.earlier ?? [];
  const target =
    payload.tradeId !== null
      ? linkOptions({ to: "/trade/mine/$tradeId", params: { tradeId: String(payload.tradeId) } })
      : linkOptions({ to: "/messages/$id", params: { id: String(payload.conversationId) } });

  return (
    <>
      <Link {...target} onClick={onOpen} className={rowClass(unread, variant)}>
        <RowBody
          lead={
            slugs.length > 0 ? (
              <NotificationStack
                slugs={slugs}
                collections={collections}
                badge={icon}
                partner={payload.partner}
              />
            ) : (
              <PartnerAvatar partner={payload.partner} icon={icon} />
            )
          }
          headline={
            <Headline
              text={eventText(notification, PARTNER_TOKEN)}
              partner={payload.partner.name}
              unread={unread}
            />
          }
          objekts={<ObjektLine slugs={payload.objekts ?? []} collections={collections} />}
          meta={
            notification.type === "trade" ? (
              <>
                <RefChip>{tradeNo(notification.payload.tradeId)}</RefChip>
                <Progress {...notification.payload.progress} />
              </>
            ) : (
              <RefChip>{offerNo(notification.payload.offerId)}</RefChip>
            )
          }
          action={action ? <ActionLabel action={action} primary={unread} /> : null}
          createdAt={notification.createdAt}
          now={now}
          unread={unread}
          variant={variant}
        />
      </Link>
      {notification.updates ? (
        <div className={cn("ps-19 pe-4 pb-1.5", rowTone(unread))}>
          <Button
            variant="ghost"
            size="xs"
            aria-expanded={expanded}
            aria-controls={earlierId}
            onClick={() => setExpanded((open) => !open)}
            className="text-muted-foreground -ms-2"
          >
            {updatesLabel(notification.updates)}
            <CaretDownIcon
              className={cn("motion-safe:transition-transform", expanded && "rotate-180")}
            />
          </Button>
          {/* mounted while closed so the toggle's aria-controls always has a target */}
          <ol id={earlierId} hidden={!expanded} className="border-s ps-3 pt-1">
            {expanded
              ? earlier.map((note) => (
                  <li key={note.id} className="flex items-start justify-between gap-3 py-1.5">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-muted-foreground text-xs text-pretty">
                        {eventText(note, note.payload.partner.name)}
                      </span>
                      {sameSlugs(note.payload.objekts, payload.objekts) ? null : (
                        <ObjektLine slugs={note.payload.objekts ?? []} collections={collections} />
                      )}
                      {note.type === "trade" ? <Progress {...note.payload.progress} /> : null}
                    </span>
                    <ItemTime createdAt={note.createdAt} now={now} />
                  </li>
                ))
              : null}
          </ol>
        </div>
      ) : null}
    </>
  );
}

function ListItem({ notification, collections, now, onOpen, variant }: RowProps<ListNotification>) {
  const first = notification.payload.latest[0];
  const text = alertText(notification, PARTNER_TOKEN, (slug) =>
    collectionName(slug, collections[slug]),
  );
  // an older tab skips a type a newer server sends
  if (!first || text === null) return null;

  const unread = notification.readAt === null;
  const tone = notificationTone(notification);
  const action = rowAction(notification);
  const slugs = shownSlugs(notification, collections);

  return (
    <Link
      to="/trade/for-you"
      search={{ match: notification.payload.match ?? "any", list: notification.payload.list.slug }}
      onClick={onOpen}
      className={rowClass(unread, variant)}
    >
      <RowBody
        lead={
          slugs.length > 0 ? (
            <NotificationStack
              slugs={slugs}
              collections={collections}
              frame={TONE_FRAME[tone.tone]}
            />
          ) : (
            <ToneTile icon={tone.icon} />
          )
        }
        headline={<Headline text={text} partner={first.partnerName} unread={unread} />}
        objekts={
          <ObjektLine
            slugs={notification.payload.latest.map((match) => match.collectionSlug)}
            collections={collections}
          />
        }
        action={action ? <ActionLabel action={action} primary={false} /> : null}
        createdAt={notification.createdAt}
        now={now}
        unread={unread}
        variant={variant}
      />
    </Link>
  );
}

/** The one place a notification picks its row; a type this tab doesn't know draws nothing. */
export function NotificationRow(props: RowProps<Notification>) {
  const { notification } = props;
  switch (notification.type) {
    case "sanction":
      return <SanctionItem {...props} notification={notification} />;
    case "offer":
    case "trade":
      return <OfferItem {...props} notification={notification} />;
    case "want_match":
    case "have_wanted":
      return <ListItem {...props} notification={notification} />;
    default:
      return null;
  }
}
