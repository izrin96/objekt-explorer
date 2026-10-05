import { CaretDownIcon, UsersThreeIcon, WarningIcon } from "@phosphor-icons/react";
import type { HolderBucketKey, HolderRow, HoldersOutput } from "@repo/api/schemas/collections";
import { useInfiniteQuery } from "@tanstack/react-query";
import { InView } from "react-intersection-observer";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ProfileCell } from "@/features/profile/profile-hover-card";
import { isSameAddress, truncateAddress } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { holdersOptions } from "../queries";
import { type Stat, StatRow } from "./stat-row";

type Summary = HoldersOutput["summary"];

const BUCKETS: Record<HolderBucketKey, { label: () => string; color: string }> = {
  "1": { label: m.objekt_holders_bucket_1, color: "bg-chart-1" },
  "2-4": { label: m.objekt_holders_bucket_2_4, color: "bg-chart-2" },
  "5-9": { label: m.objekt_holders_bucket_5_9, color: "bg-chart-3" },
  "10+": { label: m.objekt_holders_bucket_10, color: "bg-chart-4" },
};

/** a share this close to everyone leaves nothing for the chart to show */
const ONE_EACH_SHARE = 0.99;

const percent = (part: number, whole: number) =>
  (whole === 0 ? 0 : part / whole).toLocaleString(undefined, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function bucket(summary: Summary, key: HolderBucketKey) {
  return summary.buckets.find((b) => b.key === key) ?? { key, holders: 0, copies: 0 };
}

export function HoldersPanel({ slug, physical }: { slug: string; physical: boolean }) {
  const holders = useInfiniteQuery(holdersOptions(slug));
  const summary = holders.data?.pages[0]?.summary;
  const rows = holders.data?.pages.flatMap((page) => page.rows) ?? [];

  if (holders.isError && summary === undefined) {
    return <EmptyState icon={WarningIcon} title={m.common_error_loading_data()} bordered={false} />;
  }

  if (!holders.isPending && (summary === undefined || summary.holders === 0)) {
    return (
      <EmptyState
        icon={UsersThreeIcon}
        title={m.objekt_holders_empty()}
        hint={m.objekt_holders_empty_hint()}
        bordered={false}
      />
    );
  }

  const single = summary && bucket(summary, "1");
  const tenPlus = summary && bucket(summary, "10+");
  const figures: Stat[] = [
    {
      label: m.objekt_holders(),
      value: summary ? summary.holders.toLocaleString() : null,
      detail: summary
        ? (physical ? m.objekt_holders_scanned_detail : m.objekt_holders_copies_detail)({
            count: summary.copies.toLocaleString(),
          })
        : undefined,
    },
    {
      label: m.objekt_holders_own_one(),
      value: single ? single.holders.toLocaleString() : null,
      detail: summary && single ? percent(single.holders, summary.holders) : undefined,
    },
    {
      label: m.objekt_holders_own_ten(),
      value: tenPlus ? tenPlus.holders.toLocaleString() : null,
      detail:
        summary && tenPlus
          ? m.objekt_holders_own_ten_detail({ share: percent(tenPlus.copies, summary.copies) })
          : undefined,
    },
  ];

  const viewerRows = holders.data?.pages[0]?.viewer ?? [];
  const pinned = viewerRows.filter(
    (own) =>
      !rows.some(
        (row) =>
          row.isViewer &&
          row.holder.kind === "public" &&
          own.holder.kind === "public" &&
          row.holder.address === own.holder.address,
      ),
  );

  return (
    <div className="flex flex-col gap-4">
      <StatRow stats={figures} className="grid-cols-3" />

      {summary === undefined ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-5 rounded-md" />
            <Skeleton className="h-5 rounded-md" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
            <Skeleton className="h-9 rounded-lg" />
          </div>
        </>
      ) : (
        <>
          <SpreadChart summary={summary} />
          <div className="flex flex-col gap-1.5">
            <div
              data-scroll-x
              tabIndex={0}
              role="region"
              aria-label={m.objekt_holders_top()}
              className="bg-card focus-visible:ring-ring overflow-x-auto overflow-y-hidden rounded-lg border outline-none focus-visible:ring-2"
            >
              <table className="w-full min-w-96 border-collapse text-sm">
                <caption className="sr-only">{m.objekt_holders_top()}</caption>
                <thead>
                  <tr className="text-muted-foreground bg-secondary/60 text-xs tracking-wide uppercase">
                    <th scope="col" className="w-12 px-3 py-2 text-left font-medium">
                      {m.objekt_holders_rank()}
                    </th>
                    <th scope="col" className="w-full px-3 py-2 text-left font-medium">
                      {m.objekt_holders_holder()}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      {m.objekt_holders_lowest()}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      {m.objekt_holders_share()}
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      {m.objekt_holders_copies()}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <HolderTableRow
                      key={row.holder.kind === "public" ? row.holder.address : `private-${index}`}
                      row={row}
                      copies={summary.copies}
                    />
                  ))}
                  {pinned.length > 0 && (
                    <tr className="border-t" aria-hidden>
                      <td colSpan={5} className="text-muted-foreground py-0.5 text-center">
                        ⋯
                      </td>
                    </tr>
                  )}
                  {pinned.map((row, index) => (
                    <HolderTableRow
                      key={`own-${row.holder.kind === "public" ? row.holder.address : index}`}
                      row={row}
                      copies={summary.copies}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {holders.hasNextPage && (
              <InView
                as="div"
                className="flex justify-center py-3"
                onChange={(inView) => {
                  if (inView && !holders.isFetchingNextPage) void holders.fetchNextPage();
                }}
              >
                {holders.isFetchingNextPage ? (
                  <Spinner className="size-4" />
                ) : (
                  <CaretDownIcon className="text-muted-foreground size-4" aria-hidden />
                )}
              </InView>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SpreadChart({ summary }: { summary: Summary }) {
  if (bucket(summary, "1").holders / summary.holders >= ONE_EACH_SHARE) {
    return <p className="text-muted-foreground text-sm">{m.objekt_holders_one_each()}</p>;
  }

  const breakdown = summary.buckets
    .map((b) =>
      m.objekt_holders_chart_segment({
        bucket: BUCKETS[b.key].label(),
        holders: percent(b.holders, summary.holders),
        copies: percent(b.copies, summary.copies),
      }),
    )
    .join("; ");

  return (
    <figure
      role="img"
      aria-label={m.objekt_holders_chart_aria({ breakdown })}
      className="flex flex-col gap-1.5"
    >
      <SpreadBar label={m.objekt_holders()} summary={summary} pick="holders" />
      <SpreadBar label={m.objekt_holders_copies()} summary={summary} pick="copies" />
      <figcaption className="text-muted-foreground flex flex-wrap gap-x-3.5 gap-y-1 pt-1 text-xs">
        {summary.buckets.map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2 rounded-xs", BUCKETS[b.key].color)} />
            {BUCKETS[b.key].label()}
            <span className="font-mono tabular-nums">{b.holders.toLocaleString()}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

function SpreadBar({
  label,
  summary,
  pick,
}: {
  label: string;
  summary: Summary;
  pick: "holders" | "copies";
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 text-xs">
      <span className="text-muted-foreground truncate">{label}</span>
      <div className="flex h-5 gap-0.5 overflow-hidden rounded-md">
        {summary.buckets
          .filter((b) => b[pick] > 0)
          .map((b) => {
            const share = b[pick] / summary[pick];
            return (
              <span
                key={b.key}
                style={{ flexGrow: b[pick] }}
                className={cn(
                  "text-background flex min-w-0.5 basis-0 items-center overflow-hidden px-1 font-mono font-medium",
                  BUCKETS[b.key].color,
                )}
              >
                {share >= 0.15 && share.toLocaleString(undefined, { style: "percent" })}
              </span>
            );
          })}
      </div>
    </div>
  );
}

function HolderTableRow({ row, copies }: { row: HolderRow; copies: number }) {
  return (
    <tr className={cn("border-t", row.isViewer && "bg-accent")}>
      <td className="text-muted-foreground px-3 py-1.5 font-mono tabular-nums">{row.rank}</td>
      <th scope="row" className="max-w-0 px-3 py-1.5 text-left font-normal">
        <HolderName holder={row.holder} isViewer={row.isViewer} />
      </th>
      <td className="text-muted-foreground px-3 py-1.5 text-right font-mono tabular-nums">
        {row.lowestSerial === null ? "—" : `#${row.lowestSerial}`}
      </td>
      <td className="px-3 py-1.5 text-right font-mono tabular-nums">
        {percent(row.copies, copies)}
      </td>
      <td className="px-3 py-1.5 text-right font-mono font-medium tabular-nums">
        {row.copies.toLocaleString()}
      </td>
    </tr>
  );
}

function HolderName({ holder, isViewer }: { holder: HolderRow["holder"]; isViewer: boolean }) {
  if (holder.kind === "private") {
    return (
      <span className="text-muted-foreground block truncate italic">
        {m.objekt_holders_private()}
      </span>
    );
  }

  // Cosmo gives an unnamed profile its own address as the nickname
  const nickname = isSameAddress(holder.nickname, holder.address) ? null : holder.nickname;
  return (
    <ProfileCell
      address={holder.address}
      nickname={nickname}
      // fills the cell, padding included, so the whole cell opens the card
      className="-mx-3 -my-1.5 flex min-w-0 items-center gap-1.5 px-3 py-1.5"
      linkClassName={cn(
        "truncate underline-offset-2 hover:underline",
        nickname === null && "font-mono text-xs",
      )}
      after={
        isViewer && (
          <Badge variant="info" size="sm">
            {m.objekt_holders_you()}
          </Badge>
        )
      }
    >
      {nickname ?? truncateAddress(holder.address)}
    </ProfileCell>
  );
}
