import type { ReactNode } from "react";

import { collectionName } from "@/features/objekt/objekt-label";
import { progressText } from "@/features/offers/format";
import { joinList } from "@/lib/text";
import { formatTimestamp, relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { PARTNER_TOKEN, splitAround } from "./headline";
import { ACTION_LABEL } from "./row-text";
import type { RowAction } from "./sections";
import type { Collections } from "./stack";

export type RowVariant = "popover" | "sheet";

function UnreadMark() {
  return (
    <span className="absolute start-2 top-5 flex size-1.5">
      <span className="bg-accent-solid size-full rounded-full" />
      <span className="sr-only">{m.notification_unread()}</span>
    </span>
  );
}

export function ItemTime({ createdAt, now }: { createdAt: string; now: number }) {
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
export function Headline({
  text,
  partner,
  unread,
}: {
  text: string;
  partner: string;
  unread: boolean;
}) {
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

export function ObjektLine({
  slugs,
  collections,
}: {
  slugs: readonly string[];
  collections: Collections;
}) {
  if (slugs.length === 0) return null;
  return (
    <span className="text-muted-foreground truncate text-xs">
      {joinList(
        slugs.map((slug) => collectionName(slug, collections[slug])),
        "compact",
      )}
    </span>
  );
}

export function Progress({ verified, total }: { verified: number; total: number }) {
  return (
    <span className="flex items-center gap-1.5" title={progressText(verified, total)}>
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

export function RefChip({ children }: { children: ReactNode }) {
  return (
    <span className="text-foreground/80 rounded border px-1 font-mono text-xs leading-4">
      {children}
    </span>
  );
}

/** Text inside the row's link, never a control of its own: it leads where the row does. */
export function ActionLabel({ action, primary }: { action: RowAction; primary: boolean }) {
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

export function RowBody({
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
