import { ArrowsLeftRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { validType, type AggregatedTransfer, type ValidType } from "@repo/api/schemas/transfers";
import { Addresses } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { InView } from "react-intersection-observer";

import { DataTable, DataTableHead, DataTableRow } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { TimeAgo } from "@/components/shared/time-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { LONG_TAIL } from "@/features/filters/filter-popover";
import { isFiltering } from "@/features/filters/search-schema";
import { SingleSelect } from "@/features/filters/single-select";
import { useCanonicalFilters, useResetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { truncateAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { CheckpointPopover } from "../checkpoint-popover";
import { useProfileTarget } from "../profile-provider";
import { ProfileToolbar } from "../profile-toolbar";
import { transfersOptions } from "./queries";

const TYPE_LABEL: Record<ValidType, () => string> = {
  all: m.trades_filter_type_all,
  mint: m.trades_filter_type_mint,
  received: m.trades_filter_type_received,
  sent: m.trades_filter_type_sent,
  spin: m.trades_filter_type_spin,
};

const COLUMNS = "grid-cols-[7rem_minmax(14rem,1.5fr)_7rem_minmax(0,1fr)]";
const MIN_WIDTH = "min-w-160";

/** the two counterparties that are Cosmo itself rather than another collector */
function Counterparty({ row, isReceiver }: { row: AggregatedTransfer; isReceiver: boolean }) {
  if (isReceiver && row.transfer.from === Addresses.NULL) {
    return <span className="text-muted-foreground font-mono">{m.trades_cosmo()}</span>;
  }
  if (!isReceiver && row.transfer.to === Addresses.SPIN) {
    return <span className="text-muted-foreground font-mono">{m.trades_cosmo_spin()}</span>;
  }

  const address = isReceiver ? row.transfer.from : row.transfer.to;
  // a hidden Cosmo ID reaches the client as an absent nickname, and the address
  // is the only handle left to link by
  const nickname = isReceiver ? row.nickname.from : row.nickname.to;

  return (
    <Link
      to="/@{$nickname}"
      params={{ nickname: nickname ?? address }}
      className="truncate underline-offset-2 hover:underline"
    >
      {nickname ?? <span className="font-mono">{truncateAddress(address)}</span>}
    </Link>
  );
}

/** The row carries a counterparty link, so the objekt cell is the control that
 *  opens the drawer rather than the row itself. */
function TradeRow({
  row,
  address,
  onOpen,
}: {
  row: AggregatedTransfer;
  address: string;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const isReceiver = row.transfer.to.toLowerCase() === address.toLowerCase();

  return (
    <DataTableRow className="hover:bg-secondary/50">
      <span className="text-muted-foreground font-mono text-xs">
        <TimeAgo date={new Date(row.transfer.timestamp)} />
      </span>
      <button
        type="button"
        onClick={() => onOpen(row.objekt)}
        className="focus-visible:ring-ring flex min-w-0 cursor-pointer items-center rounded-sm text-left outline-none focus-visible:ring-2"
      >
        <span className="truncate">
          {row.objekt.member}
          <span className="ml-1.5 font-mono text-xs">
            {getCollectionShortNo(row.objekt)} <b className="font-semibold">#{row.objekt.serial}</b>
          </span>
        </span>
      </button>
      <span>
        <Badge variant={isReceiver ? "info" : "error"} size="sm">
          {isReceiver ? m.trades_actions_received_from() : m.trades_actions_sent_to()}
        </Badge>
      </span>
      <span className="min-w-0 truncate">
        <Counterparty row={row} isReceiver={isReceiver} />
      </span>
    </DataTableRow>
  );
}

export function TradesView() {
  const profile = useProfileTarget()!;
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useCanonicalFilters();
  const reset = useResetFilters();
  const [type, setType] = useState<ValidType>("all");
  const [active, setActive] = useState<ValidObjekt | null>(null);

  const query = useInfiniteQuery(
    transfersOptions(profile.address, {
      type,
      artist: filters.artist ?? selectedArtistIds,
      member: filters.member,
      season: filters.season,
      class: filters.class,
      on_offline: filters.on_offline,
      collection: filters.collection,
      at: filters.at,
    }),
  );

  const rows = query.data?.pages.flatMap((page) => page.results) ?? [];
  const hidden = query.data?.pages[0]?.hide === true;

  const toolbar = (
    <ProfileToolbar
      longTail={LONG_TAIL.trades}
      showSearch={false}
      showSort={false}
      showColumns={false}
      extra={
        <>
          <SingleSelect
            label={m.trades_filter_type_label()}
            options={validType.map((value) => ({ value, label: TYPE_LABEL[value]() }))}
            value={type}
            defaultValue="all"
            onChange={setType}
          />
          <CheckpointPopover />
        </>
      }
    />
  );

  if (hidden) {
    return (
      <>
        {toolbar}
        <EmptyState icon={LockSimpleIcon} title={m.trades_history_private()} />
      </>
    );
  }

  return (
    <>
      {toolbar}

      {query.isPending ? (
        <Shimmer className="h-64 w-full rounded-lg" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ArrowsLeftRightIcon}
          title={m.trades_empty()}
          hint={m.trades_empty_hint()}
          action={
            isFiltering(filters) || type !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setType("all");
                  reset();
                }}
              >
                {m.filter_reset_filter()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground font-mono text-[12.5px] tabular-nums">
            {m.trades_count({
              count: `${rows.length.toLocaleString()}${query.hasNextPage ? "+" : ""}`,
            })}
          </p>

          <DataTable columns={COLUMNS} minWidth={MIN_WIDTH}>
            <DataTableHead>
              <span>{m.trades_table_headers_date()}</span>
              <span>{m.trades_table_headers_objekt()}</span>
              <span>{m.trades_table_headers_action()}</span>
              <span>{m.trades_table_headers_user()}</span>
            </DataTableHead>
            {rows.map((row) => (
              <TradeRow
                key={row.transfer.id}
                row={row}
                address={profile.address}
                onOpen={setActive}
              />
            ))}
          </DataTable>

          {query.hasNextPage && (
            <InView
              as="div"
              className="flex justify-center py-4"
              onChange={(inView) => {
                if (inView && !query.isFetchingNextPage) void query.fetchNextPage();
              }}
            >
              {query.isFetchingNextPage && <Spinner className="size-4" />}
            </InView>
          )}
        </>
      )}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}
