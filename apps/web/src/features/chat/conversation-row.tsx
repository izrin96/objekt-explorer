import { BellSlashIcon } from "@phosphor-icons/react";
import { type ConversationRow, UNREAD_COUNT_CAP } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link, useHydrated } from "@tanstack/react-router";
import { type ReactNode } from "react";

import { TagBadges } from "@/features/list/tag-label";
import { collectionName } from "@/features/objekt/collection-name";
import { offerNo } from "@/features/offers/format";
import { OfferThumb } from "@/features/offers/offer-item";
import { OnlineAvatar } from "@/features/presence/online-avatar";
import { formatCount } from "@/lib/number";
import { relativeTime } from "@/lib/time";
import { TONE_INK, TONE_SOLID } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { Draft } from "./conversation-list-hooks";
import { ConversationMenu } from "./conversation-menu";
import { dealNo, dealTone, rowText } from "./deal-text";
import { mutedLabel } from "./format";

export function DraftRow({ draft }: { draft: Draft }) {
  return (
    <li data-conversation-row={draft.id} className={ROW_LINE}>
      <RowLink id={draft.id} partner={draft.partner} className="pe-2">
        <span className="truncate text-sm font-medium">{draft.partner.identity.name}</span>
        <span className="text-muted-foreground truncate text-sm italic">
          {m.chat_preview_draft()}
        </span>
      </RowLink>
    </li>
  );
}

/**
 * A line above every row but the first, from the text and not the avatar, so the avatars stay a
 * column; it gives way beside the open row, whose highlight already sets it apart.
 */
const ROW_LINE =
  "before:bg-border relative not-first:before:absolute not-first:before:start-15 not-first:before:end-2 not-first:before:top-0 not-first:before:h-px has-data-[status=active]:before:hidden [li:has([data-status=active])+&]:before:hidden";

function RowLink({
  id,
  partner,
  className,
  children,
}: {
  id: number;
  partner: ConversationRow["partner"];
  className?: string;
  children: ReactNode;
}) {
  const name = partner.identity.name;
  return (
    <Link
      to="/messages/$id"
      params={{ id: String(id) }}
      search={(prev) => prev}
      data-conversation-link={id}
      className={cn(
        "hover:bg-secondary/60 focus-visible:ring-ring data-[status=active]:bg-secondary flex items-start gap-3 rounded-lg py-2.5 ps-2 outline-none focus-visible:ring-2",
        className,
      )}
    >
      <OnlineAvatar
        userId={partner.userId}
        name={name}
        image={partner.user.image}
        className="size-10 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
    </Link>
  );
}

function preview(last: ConversationRow["last"]) {
  if (last.unsent) return m.chat_unsent();
  const text =
    last.body ??
    (last.offerId !== null ? m.chat_preview_offer({ offer: offerNo(last.offerId) }) : null) ??
    (last.card === "post" ? m.chat_preview_post() : m.chat_preview_card());
  return last.mine ? m.chat_preview_mine({ text }) : text;
}

export function ConversationItem({
  row,
  collections,
  now,
}: {
  row: ConversationRow;
  collections: Record<string, ValidObjekt>;
  now: number;
}) {
  const { partner, last, context, unread, unreadCount, muted, deal } = row;
  const contextCollection =
    context?.kind === "objekt" ? collections[context.collectionSlug] : undefined;
  const name = partner.identity.name;
  const hydrated = useHydrated();
  // the exact end of a mute is in the viewer's time zone, which the server render does not know
  const mutedText = muted ? (hydrated ? mutedLabel(muted) : m.chat_muted_always()) : null;

  return (
    <li data-conversation-row={row.id} className={ROW_LINE}>
      {/* the menu sits beside the link, not in it: a button inside a link is not allowed */}
      <RowLink id={row.id} partner={partner} className="pe-2">
        {/* only the name's line makes room for the menu, so the preview gets the row's width */}
        <span className="me-8 flex min-w-0 items-baseline gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread && !muted ? "font-semibold" : "font-medium",
            )}
          >
            {name}
          </span>
          <time
            dateTime={last.createdAt}
            className="text-muted-foreground shrink-0 text-xs tabular-nums"
            suppressHydrationWarning
          >
            {relativeTime(new Date(last.createdAt).getTime(), now)}
          </time>
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              unread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {preview(last)}
          </span>
          {mutedText ? (
            <span className="text-muted-foreground shrink-0" title={mutedText}>
              <BellSlashIcon className="size-3.5" aria-hidden />
              <span className="sr-only">{mutedText}</span>
            </span>
          ) : null}
          {unread ? <UnreadMark count={unreadCount} muted={muted !== null} /> : null}
        </span>
        {deal ? (
          <DealLine deal={deal} muted={muted !== null} />
        ) : context?.kind === "objekt" ? (
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <div aria-hidden className="flex">
              <OfferThumb
                slug={context.collectionSlug}
                collection={contextCollection}
                className="w-7"
              />
            </div>
            <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
              {collectionName(context.collectionSlug, contextCollection)}
              {context.serial !== null ? ` ${m.chat_card_serial({ serial: context.serial })}` : ""}
            </span>
          </div>
        ) : context?.kind === "post" ? (
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {context.post ? (
              <>
                <TagBadges tags={context.post.tags} />
                <span className="text-muted-foreground min-w-0 truncate text-xs">
                  {m.chat_post_title({ name: context.post.owner.name })}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground min-w-0 truncate text-xs">
                {m.chat_post_removed()}
              </span>
            )}
          </div>
        ) : null}
      </RowLink>
      <ConversationMenu conversation={row} name={name} className="absolute end-2 top-1.5" />
    </li>
  );
}

/** The count of unread messages; a row from before the count existed keeps the dot. */
function UnreadMark({ count, muted }: { count: number; muted: boolean }) {
  if (count === 0) {
    return (
      <span className="flex size-2 shrink-0">
        <span
          className={cn("size-full rounded-full", muted ? "bg-muted-foreground" : "bg-foreground")}
        />
        <span className="sr-only">{m.chat_unread()}</span>
      </span>
    );
  }
  const over = count >= UNREAD_COUNT_CAP;
  return (
    <span
      className={cn(
        "flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums",
        muted ? "bg-muted text-muted-foreground" : "bg-foreground text-background",
      )}
    >
      <span aria-hidden>{over ? "99+" : formatCount(count)}</span>
      <span className="sr-only">
        {over
          ? m.chat_unread_count_over()
          : count === 1
            ? m.chat_unread_count_one()
            : m.chat_unread_count({ count: formatCount(count) })}
      </span>
    </span>
  );
}

/**
 * One line that never wraps: the words truncate, the number and the trailing count stay whole.
 * A muted row is neutral whatever the state.
 */
function DealLine({ deal, muted }: { deal: NonNullable<ConversationRow["deal"]>; muted: boolean }) {
  const tone = muted ? "neutral" : dealTone(deal.state);
  const { words, trailing } = rowText(deal);
  return (
    <span className={cn("mt-1 flex min-w-0 items-center gap-1.5 text-xs", TONE_INK[tone])}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_SOLID[tone])} />
      <span className="shrink-0 font-mono">{dealNo(deal)}</span>
      <span aria-hidden className="shrink-0">
        ·
      </span>
      <span className="min-w-0 truncate">{words}</span>
      {trailing ? (
        <>
          <span aria-hidden className="shrink-0">
            ·
          </span>
          <span className="shrink-0">{trailing}</span>
        </>
      ) : null}
    </span>
  );
}
