import {
  CardsThreeIcon,
  CaretUpIcon,
  CurrencyDollarIcon,
  DotsThreeIcon,
  PlusIcon,
  ScalesIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { filterObjekts } from "@/features/filters/filter-utils";
import { PickerFilterBar } from "@/features/filters/picker-filter-bar";
import {
  NO_PICKER_FILTERS,
  pickerFiltered,
  toFilterSearch,
} from "@/features/filters/picker-filters";
import type { StoredList } from "@/features/list/list-draft";
import { formatPrice } from "@/features/list/list-price";
import { listEntriesOptions, listFindOptions } from "@/features/list/queries";
import { RatioChip } from "@/features/list/ratio-chip";
import { appliedRatio, type RatioSide, ratioName } from "@/features/list/ratio-text";
import { useOpenAddToList } from "@/features/list/use-open-add-to-list";
import { CardGridSkeleton } from "@/features/objekt/card-grid";
import { PriceCaption, RATIO_ON_CARD } from "@/features/objekt/objekt-card";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { LoadError } from "@/features/trade/load-error";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

import { SideAddToList } from "./preview-entries";
import { TickTile } from "./tick-tile";
import { TickedTray } from "./ticked-tray";
import { useSideDialogs } from "./use-side-dialogs";

type Props = {
  slug: string;
  name: string;
  ratio: RatioSide | null;
  /** swaps this sheet's content for the list's Add objekts */
  onAdd: () => void;
};

/**
 * Every objekt of a picked side, in the Add objekts sheet's shape: filters over a grid where a
 * tap ticks a card, and what is ticked beside it with the actions that change or remove it.
 */
export function AllObjektsSheet(props: Props) {
  const { data: stored } = useQuery(listFindOptions(props.slug, true));
  return (
    <SideAddToList stored={stored}>
      <AllObjektsBody {...props} stored={stored} />
    </SideAddToList>
  );
}

type Action = { label: string; icon: ReactNode; run: (from: HTMLElement | null) => void };

function AllObjektsBody({
  slug,
  name,
  ratio,
  onAdd,
  stored,
}: Props & { stored: StoredList | undefined }) {
  const entriesQuery = useQuery(listEntriesOptions(slug, []));
  const title = useRef<HTMLHeadingElement>(null);
  // a Change menu item is gone once its dialog closes, so focus returns to the menu's button
  const change = useRef<HTMLButtonElement>(null);
  const { bulkActions, dialogs, currency } = useSideDialogs({
    slug,
    stored,
    side: ratio,
    fallback: title,
  });
  const openAddToList = useOpenAddToList();
  const [filters, setFilters] = useState(NO_PICKER_FILTERS);
  // local, never the shared selection store: that one puts every mounted card in select mode
  const [ticked, setTicked] = useState<ReadonlySet<number>>(() => new Set());

  const entries = entriesQuery.data ?? [];
  const filtered = pickerFiltered(filters);
  const rows = filtered ? filterObjekts(toFilterSearch(filters), entries) : entries;
  // derived, so an entry that leaves the list leaves the ticks, and a saved price shows at once
  const selected = entries.filter((entry) => ticked.has(entry.entryId));
  const count = selected.length;
  const none = count === 0;
  const listRatio = stored?.ratio ?? null;

  const toggle = (entryId: number) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  const allTicked = rows.length > 0 && rows.every((entry) => ticked.has(entry.entryId));
  const tickRows = () =>
    setTicked((prev) => {
      const next = new Set(prev);
      for (const entry of rows) {
        if (allTicked) next.delete(entry.entryId);
        else next.add(entry.entryId);
      }
      return next;
    });

  const { price, ratio: setRatio, remove } = bulkActions;
  const actions: Action[] = [
    ...(setRatio
      ? [
          {
            label: m.filter_set_ratio(),
            icon: <ScalesIcon />,
            run: (from: HTMLElement | null) => setRatio(selected, from),
          },
        ]
      : []),
    ...(price
      ? [
          {
            label: m.filter_set_price(),
            icon: <CurrencyDollarIcon />,
            run: (from: HTMLElement | null) => price(selected, from),
          },
        ]
      : []),
    {
      label: m.trade_composer_all_add_to_list(),
      icon: <PlusIcon />,
      run: () => openAddToList(selected),
    },
  ];
  const removeLabel = none
    ? m.trade_composer_all_remove_none()
    : m.trade_composer_all_remove({ count: formatCount(count) });

  const tray = {
    ticked: new Map(selected.map((entry) => [String(entry.entryId), entry])),
    onUntick: (key: string) =>
      setTicked((prev) => {
        const next = new Set(prev);
        next.delete(Number(key));
        return next;
      }),
    onClear: () => setTicked(new Set()),
    action: (
      <Button variant="ghost" size="xs" disabled={rows.length === 0} onClick={tickRows}>
        {filtered
          ? allTicked
            ? m.trade_composer_all_untick_shown()
            : m.trade_composer_all_tick_shown()
          : allTicked
            ? m.trade_composer_all_untick_all()
            : m.trade_composer_all_tick_all()}
      </Button>
    ),
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 pe-8">
          <div className="flex min-w-0 flex-col gap-1">
            <SheetTitle ref={title} tabIndex={-1} className="font-display text-lg outline-none">
              {m.trade_composer_all_title({ list: name })}
            </SheetTitle>
            {/* only once the count is known, never a 0 while loading */}
            {entriesQuery.data ? (
              <SheetDescription className="text-pretty max-md:sr-only">
                {m.trade_composer_all_desc({ count: formatCount(entries.length) })}
              </SheetDescription>
            ) : null}
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={onAdd}>
            <PlusIcon />
            {m.trade_composer_all_add()}
          </Button>
        </div>
        {/* the tray's badge can't announce: below `md` it sits in a closed popover */}
        <p aria-live="polite" className="sr-only">
          {m.trade_composer_all_ticked_live({ count: formatCount(count) })}
        </p>
        <PickerFilterBar filters={filters} onChange={setFilters} />
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_16rem] md:grid-rows-1 md:gap-4">
          <div className="flex min-h-0 flex-col" data-entry-grid="">
            {entriesQuery.isError ? (
              <LoadError
                bordered={false}
                error={entriesQuery.error}
                onRetry={() => void entriesQuery.refetch()}
              />
            ) : entriesQuery.isPending ? (
              <CardGridSkeleton />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={CardsThreeIcon}
                bordered={false}
                title={
                  entries.length === 0
                    ? m.trade_composer_all_empty()
                    : m.trade_composer_add_no_match()
                }
              />
            ) : (
              <VirtualCardGrid
                sections={[{ title: null, items: rows }]}
                getKey={(entry) => String(entry.entryId)}
                renderItem={(entry) => (
                  <EntryTile
                    entry={entry}
                    ticked={ticked.has(entry.entryId)}
                    onToggle={() => toggle(entry.entryId)}
                    side={ratio}
                    listRatio={listRatio}
                    currency={currency}
                  />
                )}
              />
            )}
          </div>
          <aside className="flex min-h-0 flex-col gap-3 border-s ps-4 max-md:hidden">
            <TickedTray {...tray} scrollClassName="flex-1" listClassName="grid-cols-3" />
            <div className="flex flex-col gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  disabled={none}
                  onClick={(event) => action.run(event.currentTarget)}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
              <Button
                variant="destructive-outline"
                disabled={none}
                onClick={(event) => remove(selected, event.currentTarget)}
              >
                <TrashIcon />
                {removeLabel}
              </Button>
            </div>
          </aside>
          <div className="flex min-w-0 items-center gap-2 border-t pt-3 md:hidden">
            <Popover>
              {/* one width whatever the count, so Change and Remove keep their places */}
              <PopoverTrigger
                render={<Button variant="outline" className="min-w-26 shrink-0 tabular-nums" />}
              >
                <CardsThreeIcon aria-hidden />
                <span className="sr-only">{m.trade_composer_add_ticked()}</span>
                <span>{formatCount(count)}</span>
                <CaretUpIcon aria-hidden className="size-3.5 opacity-60" />
              </PopoverTrigger>
              <PopoverPopup side="top" align="start" className="w-80 max-w-full">
                <div className="flex flex-col gap-3">
                  <TickedTray {...tray} scrollClassName="max-h-64" listClassName="grid-cols-4" />
                </div>
              </PopoverPopup>
            </Popover>
            <Menu>
              <MenuTrigger
                ref={change}
                disabled={none}
                render={<Button variant="outline" className="min-w-0 flex-1" />}
              >
                <DotsThreeIcon weight="bold" />
                <span className="truncate">{m.trade_composer_all_change()}</span>
              </MenuTrigger>
              <MenuPopup side="top" align="end" className="min-w-44">
                {actions.map((action) => (
                  <MenuItem key={action.label} onClick={() => action.run(change.current)}>
                    {action.icon}
                    {action.label}
                  </MenuItem>
                ))}
              </MenuPopup>
            </Menu>
            <Button
              variant="destructive-outline"
              className="min-w-0 flex-1"
              disabled={none}
              onClick={(event) => remove(selected, event.currentTarget)}
            >
              <TrashIcon />
              <span className="truncate">{removeLabel}</span>
            </Button>
          </div>
        </div>
      </div>
      {dialogs}
    </>
  );
}

function EntryTile({
  entry,
  ticked,
  onToggle,
  side,
  listRatio,
  currency,
}: {
  entry: ListObjekt;
  ticked: boolean;
  onToggle: () => void;
  side: RatioSide | null;
  listRatio: number | null;
  currency: string | null;
}) {
  const applied = side ? appliedRatio(entry.ratio, listRatio) : null;
  return (
    <TickTile
      objekt={entry}
      ticked={ticked}
      onToggle={onToggle}
      showLabel
      // the chip lies inert over the card and the tile's name hides its text, so the tile carries it
      title={
        applied && side
          ? ratioName(applied.ratio, side, { owner: true, inherited: applied.inherited })
          : undefined
      }
      overlay={
        applied && side ? (
          <RatioChip
            ratio={applied.ratio}
            side={side}
            owner
            inherited={applied.inherited}
            className={RATIO_ON_CARD}
          />
        ) : undefined
      }
      caption={
        currency === null ? undefined : (
          <PriceCaption
            price={formatPrice(currency, entry, false)}
            priceMuted={entry.price === null && !entry.isQyop}
            note={entry.note}
          />
        )
      }
    />
  );
}
