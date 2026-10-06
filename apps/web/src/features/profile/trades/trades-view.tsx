import { ArrowsLeftRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import {
  transferTypeSchema,
  type TransferItem,
  type TransferType,
} from "@repo/api/schemas/transfers";
import { Addresses } from "@repo/lib";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { DataTable, DataTableHead, DataTableRow } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Timestamp } from "@/components/shared/timestamp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import type { ExtraFacet } from "@/features/filters/facet-controls";
import { LONG_TAIL } from "@/features/filters/long-tail";
import { canReset, isFiltering } from "@/features/filters/search-schema";
import { SingleSelect } from "@/features/filters/single-select";
import { useCanonicalFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektNameButton } from "@/features/objekt/objekt-hover-card";
import { isSameAddress, truncateAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { CheckpointPopover } from "../checkpoint-popover";
import { ProfileCell } from "../profile-hover-card";
import { useProfile } from "../profile-provider";
import { ProfileToolbar } from "../profile-toolbar";
import { transfersOptions } from "./queries";
import { useResetTrades, useSetTradesType, useTradesType } from "./search-schema";

const TYPE_LABEL: Record<TransferType, () => string> = {
  all: m.trades_filter_type_all,
  mint: m.trades_filter_type_mint,
  received: m.trades_filter_type_received,
  sent: m.trades_filter_type_sent,
  spin: m.trades_filter_type_spin,
};

const COLUMNS = "grid-cols-[10.5rem_minmax(14rem,1.5fr)_7rem_minmax(0,1fr)]";
const MIN_WIDTH = "min-w-168";

/** the two counterparties that are Cosmo itself rather than another collector */
function Counterparty({ row, isReceiver }: { row: TransferItem; isReceiver: boolean }) {
  if (isReceiver && row.transfer.from === Addresses.NULL) {
    return (
      <span className="text-muted-foreground min-w-0 truncate font-mono">{m.trades_cosmo()}</span>
    );
  }
  if (!isReceiver && row.transfer.to === Addresses.SPIN) {
    return (
      <span className="text-muted-foreground min-w-0 truncate font-mono">
        {m.trades_cosmo_spin()}
      </span>
    );
  }

  const address = isReceiver ? row.transfer.from : row.transfer.to;
  // a hidden Cosmo ID reaches the client as an absent nickname, and the address
  // is the only handle left to link by
  const nickname = isReceiver ? row.nickname.from : row.nickname.to;

  return (
    <ProfileCell
      address={address}
      nickname={nickname}
      className="flex min-w-0 items-center self-stretch"
      linkClassName="truncate underline-offset-2 hover:underline"
    >
      {nickname ?? <span className="font-mono">{truncateAddress(address)}</span>}
    </ProfileCell>
  );
}

/** The row carries a counterparty link, so the objekt cell is the control that
 *  opens the drawer rather than the row itself. */
function TradeRow({
  row,
  address,
  onOpen,
}: {
  row: TransferItem;
  address: string;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const isReceiver = isSameAddress(row.transfer.to, address);

  return (
    <DataTableRow className="hover:bg-secondary/50">
      <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
        <Timestamp date={new Date(row.transfer.timestamp)} />
      </span>
      <ObjektNameButton objekt={row.objekt} onOpen={onOpen} />
      <span>
        <Badge variant={isReceiver ? "info" : "error"} size="sm">
          {isReceiver ? m.trades_actions_received_from() : m.trades_actions_sent_to()}
        </Badge>
      </span>
      <Counterparty row={row} isReceiver={isReceiver} />
    </DataTableRow>
  );
}

function TradesTypeFilter({ className }: { className?: string }) {
  const type = useTradesType();
  const setType = useSetTradesType();
  return (
    <SingleSelect
      label={m.trades_filter_type_label()}
      options={transferTypeSchema.options.map((value) => ({ value, label: TYPE_LABEL[value]() }))}
      value={type}
      defaultValue="all"
      onChange={setType}
      className={className}
    />
  );
}

export function TradesView() {
  const profile = useProfile();
  const { selectedArtistIds } = useCosmoArtist();
  const filters = useCanonicalFilters();
  const reset = useResetTrades();
  const type = useTradesType();
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

  // a fresh array each render would re-run the facet parity effect forever
  const extras = useMemo<ExtraFacet[]>(
    () => [{ key: "type", active: type !== "all", quick: true, Control: TradesTypeFilter }],
    [type],
  );

  const rows = query.data?.pages.flatMap((page) => page.results) ?? [];
  const hidden = query.data?.pages[0]?.hide === true;

  const toolbar = (
    <ProfileToolbar
      longTail={LONG_TAIL.trades}
      showSearch={false}
      showSort={false}
      showColumns={false}
      extras={extras}
      extrasFirst
      extra={<CheckpointPopover />}
      onReset={reset}
      resetDisabled={!canReset(filters) && type === "all"}
    />
  );

  if (hidden) {
    return (
      <>
        {toolbar}
        <EmptyState
          icon={LockSimpleIcon}
          title={m.trades_history_private()}
          hint={m.trades_history_private_hint()}
        />
      </>
    );
  }

  return (
    <>
      {toolbar}

      {query.isPending ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ArrowsLeftRightIcon}
          title={m.trades_empty()}
          hint={m.trades_empty_hint()}
          action={
            isFiltering(filters) || type !== "all" ? (
              <Button variant="outline" size="sm" onClick={reset}>
                {m.filter_reset_filter()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground font-mono text-xs tabular-nums">
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

          <InfiniteSentinel
            label={m.infinite_query_load_more_aria()}
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            fetchNextPage={() => void query.fetchNextPage()}
          />
        </>
      )}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}
