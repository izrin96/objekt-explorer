import {
  ArrowsLeftRightIcon,
  CaretDownIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  type Icon,
  PackageIcon,
  ShieldWarningIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { NoteEvent, Notification } from "@repo/api/schemas/notification";
import { Link, linkOptions } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import { untilLabel } from "@/features/chat/format";
import { collectionName } from "@/features/objekt/objekt-label";
import {
  offerNo,
  offerNotificationText,
  tradeNo,
  tradeNotificationText,
} from "@/features/offers/format";
import { formatTimestamp, relativeTime } from "@/lib/time";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { PARTNER_TOKEN, splitAround } from "./headline";
import {
  ACTION_LABEL,
  alertText,
  type ListNotification,
  sanctionText,
  updatesLabel,
} from "./row-text";
import { type RowAction, rowAction } from "./sections";
import { type Collections, sameSlugs, shownSlugs } from "./stack";
import { type NotificationIcon, notificationTone } from "./tone";

export type RowVariant = "popover" | "sheet";

const TONE_ICON: Record<NotificationIcon, Icon> = {
  check: CheckIcon,
  clock: ClockIcon,
  cross: XIcon,
  arrow: ArrowsLeftRightIcon,
  heart: HeartIcon,
  package: PackageIcon,
  shield: ShieldWarningIcon,
  warning: WarningIcon,
};

/** An alert's objekts keep their list type's colour; it is the one colour a row has besides class stripes. */
const TONE_FRAME: Partial<Record<Tone, string>> = {
  want: "outline-type-want",
  have: "outline-type-have",
};

/** Every leading mark sits in this slot, so the text beside it does not move between kinds. */
const SLOT = "relative flex h-12 w-11 shrink-0";

const ROW =
  "hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring relative flex items-start gap-3 py-2.5 ps-5 pe-4 outline-none focus-visible:ring-2 focus-visible:ring-inset";

type Partner = { name: string; image?: string | null };

function Glyph({ icon, className }: { icon: NotificationIcon; className?: string }) {
  const Mark = TONE_ICON[icon];
  return <Mark aria-hidden weight="bold" className={className} />;
}

function Badge({ icon }: { icon: NotificationIcon }) {
  return (
    <span className="bg-popover absolute start-6 top-7.5 z-10 rounded-full p-0.5">
      <span className="bg-muted text-foreground grid size-4.5 place-items-center rounded-full">
        <Glyph icon={icon} className="size-2.5" />
      </span>
    </span>
  );
}

function PartnerFace({ partner, className }: { partner: Partner; className?: string }) {
  return <PersonAvatar name={partner.name} image={partner.image} className={className} />;
}

function ToneTile({ icon }: { icon: NotificationIcon }) {
  return (
    <span className={SLOT}>
      <span className="bg-muted text-foreground grid h-10 w-7 place-items-center rounded">
        <Glyph icon={icon} className="size-4" />
      </span>
    </span>
  );
}

/** Where each objekt of a stack sits, counted from the front one. */
const DECK = [
  "start-0 top-1",
  "start-1.25 top-0.5 opacity-80",
  "start-2.5 top-0 opacity-50",
] as const;

/** `partner` sits on the stack's other corner, so an offer's objekts still show who it is with. */
function NotificationStack({
  slugs,
  collections,
  frame,
  badge,
  partner,
}: {
  slugs: readonly string[];
  collections: Collections;
  frame?: string;
  badge?: NotificationIcon;
  partner?: Partner;
}) {
  return (
    <span className={SLOT}>
      {/* the front one last, so it paints over the rest */}
      {slugs
        .map((slug, depth) => ({ slug, depth }))
        .toReversed()
        .map(({ slug, depth }) => (
          <img
            key={depth}
            src={collections[slug]?.thumbnailImage}
            alt=""
            className={cn(
              "aspect-photocard absolute w-7 rounded-sm object-cover",
              DECK[depth],
              frame && ["outline-offset-1", slugs.length > 1 ? "outline-1" : "outline-2", frame],
            )}
          />
        ))}
      {partner ? (
        <span className="bg-popover absolute -start-1.5 top-7.5 z-10 rounded-full p-0.5">
          <PartnerFace partner={partner} className="size-4.5" />
        </span>
      ) : null}
      {badge ? <Badge icon={badge} /> : null}
    </span>
  );
}

function PartnerAvatar({ partner, icon }: { partner: Partner; icon: NotificationIcon }) {
  return (
    <span className={SLOT}>
      <PartnerFace partner={partner} className="mt-1 size-9 text-sm" />
      <Badge icon={icon} />
    </span>
  );
}

function UnreadMark() {
  return (
    <span className="absolute start-2 top-5 flex size-1.5">
      <span className="bg-accent-solid size-full rounded-full" />
      <span className="sr-only">{m.notification_unread()}</span>
    </span>
  );
}

function ItemTime({ createdAt, now }: { createdAt: string; now: number }) {
  return (
    <time
      dateTime={createdAt}
      title={formatTimestamp(new Date(createdAt))}
      className="text-muted-foreground shrink-0 pt-0.5 text-xs whitespace-nowrap tabular-nums"
    >
      {/* narrow ("2w ago"), so the time column leaves the headline room; the title has the instant */}
      {relativeTime(new Date(createdAt).getTime(), now, "year", "narrow")}
    </time>
  );
}

/**
 * `text` was written with `PARTNER_TOKEN` for the partner, so the name is bold wherever the
 * language puts it; a headline without the token never named them.
 */
function Headline({ text, partner, unread }: { text: string; partner: string; unread: boolean }) {
  const parts = splitAround(text, PARTNER_TOKEN);
  return (
    <span
      className={cn(
        "text-sm text-pretty break-words",
        unread ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {parts ? (
        <>
          {parts.before}
          <strong
            className={cn("font-semibold", unread ? "text-foreground" : "text-foreground/80")}
          >
            {partner}
          </strong>
          {parts.after}
        </>
      ) : (
        text
      )}
    </span>
  );
}

function ObjektLine({
  slugs,
  collections,
}: {
  slugs: readonly string[];
  collections: Collections;
}) {
  if (slugs.length === 0) return null;
  return (
    <span className="text-muted-foreground truncate text-xs">
      {slugs.map((slug) => collectionName(slug, collections[slug])).join(", ")}
    </span>
  );
}

function Progress({ verified, total }: { verified: number; total: number }) {
  return (
    <span className="flex items-center gap-1.5" title={m.offer_progress({ verified, total })}>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: total }, (_, at) => (
          <span
            key={at}
            className={cn("h-1 w-3.5 rounded-full", at < verified ? "bg-foreground" : "bg-muted")}
          />
        ))}
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">
        {m.offer_trade_step_progress({ verified, total })}
      </span>
    </span>
  );
}

function RefChip({ children }: { children: ReactNode }) {
  return (
    <span className="text-foreground/80 rounded border px-1 font-mono text-xs leading-4">
      {children}
    </span>
  );
}

/** Text inside the row's link, never a control of its own: it leads where the row does. */
function ActionLabel({ action, primary }: { action: RowAction; primary: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium whitespace-nowrap",
        primary ? "bg-foreground text-background border-foreground" : "text-foreground",
      )}
    >
      {ACTION_LABEL[action]()}
    </span>
  );
}

function RowBody({
  lead,
  headline,
  objekts,
  meta,
  action,
  createdAt,
  now,
  unread,
  variant,
}: {
  lead: ReactNode;
  headline: ReactNode;
  objekts?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  createdAt: string;
  now: number;
  unread: boolean;
  variant: RowVariant;
}) {
  return (
    <>
      {unread ? <UnreadMark /> : null}
      {lead}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {headline}
        {objekts}
        {meta || (action && variant === "popover") ? (
          <span className="flex flex-wrap items-center gap-2">
            {meta}
            {variant === "popover" && action ? <span className="ms-auto">{action}</span> : null}
          </span>
        ) : null}
        {variant === "sheet" && action ? <span className="mt-1">{action}</span> : null}
      </span>
      <ItemTime createdAt={createdAt} now={now} />
    </>
  );
}

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
            onClick={() => setExpanded((open) => !open)}
            className="text-muted-foreground -ms-2"
          >
            {updatesLabel(notification.updates)}
            <CaretDownIcon className={cn("transition-transform", expanded && "rotate-180")} />
          </Button>
          {expanded ? (
            <ol className="border-s ps-3 pt-1">
              {earlier.map((note) => (
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
              ))}
            </ol>
          ) : null}
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
