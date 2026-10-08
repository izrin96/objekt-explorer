import { ArrowClockwiseIcon, HandshakeIcon, WarningIcon } from "@phosphor-icons/react";
import type { MineRow } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useId } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { RowsSkeleton } from "@/components/shared/rows-skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { mineStatusText, offerNo, offerSummary, tradeNo } from "./format";
import { ProgressRing } from "./progress-ring";
import { mineOptions } from "./queries";
import { StatusBadge, statusTone } from "./status-badge";

type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

export function MyTradesView() {
  const query = useInfiniteQuery(mineOptions());

  if (query.isPending) return <MyTradesSkeleton />;

  if (query.isError) {
    return (
      <EmptyState
        icon={WarningIcon}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  const { pages } = query.data;
  const groups = pages[0]?.groups ?? { needsYou: [], waiting: [], inProgress: [] };
  const history = pages.flatMap((page) => page.history.items);
  const collections: Collections = Object.assign({}, ...pages.map((page) => page.collections));
  const now = new Date(pages[0]?.now ?? 0).getTime();

  if (
    groups.needsYou.length + groups.waiting.length + groups.inProgress.length + history.length ===
    0
  ) {
    return (
      <EmptyState
        icon={HandshakeIcon}
        title={m.offer_mine_empty()}
        hint={m.offer_mine_empty_hint()}
        action={
          <Button variant="outline" size="sm" render={<Link to="/trade" />}>
            {m.trade_tab_browse()}
          </Button>
        }
      />
    );
  }

  const sections = [
    { key: "needs", title: m.offer_mine_needs_you(), rows: groups.needsYou },
    { key: "waiting", title: m.offer_mine_waiting(), rows: groups.waiting },
    { key: "progress", title: m.offer_mine_in_progress(), rows: groups.inProgress },
    // History pages in as the list scrolls, so a count would read as a total it isn't
    { key: "history", title: m.offer_mine_history(), rows: history, uncounted: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => (
        <MineSection
          key={section.key}
          title={section.title}
          rows={section.rows}
          counted={!section.uncounted}
          collections={collections}
          now={now}
        />
      ))}
      <InfiniteSentinel
        label={m.infinite_query_load_more_aria()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isError={query.isFetchNextPageError}
        fetchNextPage={() => void query.fetchNextPage()}
      />
    </div>
  );
}

function MineSection({
  title,
  rows,
  counted,
  collections,
  now,
}: {
  title: string;
  rows: MineRow[];
  counted: boolean;
  collections: Collections;
  now: number;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="flex items-baseline gap-2 text-sm font-medium">
        {title}
        {counted ? (
          <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
            {rows.length}
          </span>
        ) : null}
      </h2>
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm">
          {m.offer_mine_group_empty()}
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {rows.map((row) => (
            <li key={`${row.kind}:${row.id}`}>
              <MineRowLink row={row} collections={collections} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const rowClass =
  "hover:bg-secondary/60 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset";

function MineRowLink({
  row,
  collections,
  now,
}: {
  row: MineRow;
  collections: Collections;
  now: number;
}) {
  const { partner } = row;
  const name = partner.identity.name;
  const body = (
    <>
      <Avatar className="size-9 shrink-0">
        {partner.user.image ? <AvatarImage src={partner.user.image} alt="" /> : null}
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 font-medium break-words">{name}</span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {row.kind === "trade" ? tradeNo(row.id) : offerNo(row.id)}
          </span>
          {/* the server's clock, so the server and browser renders agree */}
          <time dateTime={row.at} className="text-muted-foreground text-xs">
            {relativeTime(new Date(row.at).getTime(), now)}
          </time>
        </span>
        <span className="text-muted-foreground text-sm break-words">
          {offerSummary(row, collections)}
        </span>
      </span>
      {row.status === "in_progress" && row.progress && row.progress.total > 0 ? (
        <ProgressRing verified={row.progress.verified} total={row.progress.total} />
      ) : null}
      {row.yourTurn ? (
        <Badge variant="secondary" className="shrink-0">
          {mineStatusText(row)}
        </Badge>
      ) : (
        <StatusBadge tone={statusTone(row.status)} className="shrink-0">
          {mineStatusText(row)}
        </StatusBadge>
      )}
    </>
  );

  return row.kind === "trade" ? (
    <Link to="/trade/mine/$tradeId" params={{ tradeId: String(row.id) }} className={rowClass}>
      {body}
    </Link>
  ) : (
    <Link to="/messages/$id" params={{ id: String(row.conversationId) }} className={rowClass}>
      {body}
    </Link>
  );
}

/** Also the route's pending view, under the layout's header and tabs. */
export function MyTradesSkeleton() {
  return <RowsSkeleton status />;
}
