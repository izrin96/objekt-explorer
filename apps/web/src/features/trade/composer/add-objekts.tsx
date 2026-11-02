import { CardsThreeIcon, InfoIcon, LinkIcon, XIcon } from "@phosphor-icons/react";
import { canBeOnTrade } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { toastManager } from "@/components/ui/toast";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { GridSkeleton, LoadError } from "@/features/chat/attach/attach-picker-parts";
import { filterObjekts } from "@/features/filters/filter-utils";
import {
  NO_PICKER_FILTERS,
  PickerFilterBar,
  type PickerFacetFilters,
  pickerFiltered,
  toFilterSearch,
} from "@/features/filters/picker-filter-bar";
import { useAddToList } from "@/features/list/actions";
import { addedToast, profileLabel } from "@/features/list/add-to-list-text";
import type { StoredList } from "@/features/list/list-draft";
import { PriceFields, type PriceValue } from "@/features/list/price-fields";
import { listFindOptions } from "@/features/list/queries";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { collectionName } from "@/features/objekt/objekt-label";
import { isObjektOwned } from "@/features/objekt/objekt-utils";
import { collectionOptions } from "@/features/objekt/queries";
import { VirtualCardGrid } from "@/features/objekt/virtual-card-grid";
import { ownedCollectionOptions } from "@/features/profile/queries";
import { useUserProfiles } from "@/features/user/hooks";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { addObjektsRequest, addSourceOf } from "./add-objekts-request";

type Ticked = ReadonlyMap<string, ValidObjekt>;

type GridProps = {
  filters: PickerFacetFilters;
  ticked: Ticked;
  onToggle: (key: string, objekt: ValidObjekt) => void;
};

/**
 * Add objekts on a picked side: the filters across the top, the grid, and the Ticked tray beside
 * it from `md` (under it below). Adding saves to the list at once and closes.
 */
export function AddObjektsSheet({
  slug,
  name,
  onDone,
}: {
  slug: string;
  name: string;
  onDone: () => void;
}) {
  const stored = useQuery(listFindOptions(slug, true));
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
      {stored.data ? (
        <AddObjektsBody list={stored.data} name={name} onDone={onDone} />
      ) : (
        <>
          <SheetTitle className="font-display pe-8 text-lg">
            {m.trade_composer_add_title({ list: name })}
          </SheetTitle>
          {stored.isError ? <LoadError onRetry={() => void stored.refetch()} /> : <GridSkeleton />}
        </>
      )}
    </div>
  );
}

function AddObjektsBody({
  list,
  name,
  onDone,
}: {
  list: StoredList;
  name: string;
  onDone: () => void;
}) {
  const profiles = useUserProfiles();
  const add = useAddToList();
  const [filters, setFilters] = useState(NO_PICKER_FILTERS);
  const [ticked, setTicked] = useState<Ticked>(() => new Map());
  const [price, setPrice] = useState<PriceValue>({ price: null, isQyop: false, note: "" });
  const source = addSourceOf(list);
  const owner = source === "owned" ? list.profileAddress : null;
  const profileName = (address: string) => profileLabel(profiles, address);
  // a new post can't pick a list already on Trade, so this holds only for a list in the post being edited
  const onTrade = list.discoverable === true && canBeOnTrade(list.listType, list.isProfileBind);
  // where focus lands when the control holding it leaves the tray
  const trayHeading = useRef<HTMLSpanElement>(null);

  const toggle = (key: string, objekt: ValidObjekt) =>
    setTicked((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, objekt);
      return next;
    });

  const submit = () => {
    const request = addObjektsRequest(list, [...ticked.keys()], price);
    if (!request) return;
    add.mutate(request, {
      onSuccess: (result) => {
        toastManager.add(addedToast(result, { dropped: 0, owner, profileName }));
        onDone();
      },
    });
  };

  const count = ticked.size;
  const gridProps = { filters, ticked, onToggle: toggle };

  return (
    <>
      <div className="flex flex-col gap-1">
        <SheetTitle className="font-display pe-8 text-lg">
          {m.trade_composer_add_title({ list: name })}
        </SheetTitle>
        <SheetDescription className="text-pretty">
          {owner !== null
            ? m.trade_composer_add_source_owned({ profile: profileName(owner) })
            : source === "collections"
              ? m.trade_composer_add_source_want()
              : m.trade_composer_add_unbound()}
        </SheetDescription>
      </div>
      {onTrade ? (
        <Alert variant="warning">
          <InfoIcon aria-hidden />
          <AlertDescription>{m.trade_composer_add_on_trade({ list: name })}</AlertDescription>
        </Alert>
      ) : null}
      <PickerFilterBar filters={filters} onChange={setFilters} />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_16rem] md:grid-rows-1 md:gap-4">
        {/* a plain column, not SheetPanel: its ScrollArea gives virtua no viewport */}
        <div className="flex min-h-0 flex-col">
          {owner !== null ? (
            <OwnedGrid address={owner} {...gridProps} />
          ) : source === "collections" ? (
            <CollectionGrid {...gridProps} />
          ) : (
            <EmptyState icon={LinkIcon} bordered={false} title={m.trade_composer_add_unbound()} />
          )}
        </div>
        <aside className="flex min-h-0 flex-col gap-3 max-md:border-t max-md:pt-3 md:border-s md:ps-4">
          <div className="flex items-center gap-2">
            <span ref={trayHeading} tabIndex={-1} className="text-sm font-medium outline-none">
              {m.trade_composer_add_ticked()}
            </span>
            <Badge variant="outline" className="tabular-nums">
              {count.toLocaleString(getLocale())}
            </Badge>
            <Button
              variant="ghost"
              size="xs"
              className="ms-auto"
              disabled={count === 0}
              onClick={() => {
                trayHeading.current?.focus();
                setTicked(new Map());
              }}
            >
              {m.trade_composer_add_clear()}
            </Button>
          </div>
          {count === 0 ? (
            <p className="text-muted-foreground text-xs text-pretty">
              {m.trade_composer_add_tray_empty()}
            </p>
          ) : (
            <TickedList
              ticked={ticked}
              onUntick={toggle}
              onEmptied={() => trayHeading.current?.focus()}
            />
          )}
          {list.listType === "sale" ? (
            <div className="flex flex-col gap-3">
              <PriceFields
                currency={list.currency ?? ""}
                value={price}
                onChange={setPrice}
                priceHint={
                  <p className="text-muted-foreground text-xs text-pretty">
                    {m.trade_composer_add_price_hint()}
                  </p>
                }
              />
            </div>
          ) : null}
          <div className="flex gap-2">
            <SheetClose render={<Button variant="outline" className="flex-1" />}>
              {m.common_modal_cancel()}
            </SheetClose>
            <Button
              className="flex-1"
              disabled={count === 0}
              loading={add.isPending}
              onClick={submit}
            >
              {count === 0
                ? m.list_manage_objekt_add_button()
                : m.trade_composer_add_button({ count: count.toLocaleString(getLocale()) })}
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}

/** "Lynn SCO #12": two copies of one collection read apart by their serial. */
function tickedName(objekt: ValidObjekt) {
  const base = collectionName(objekt.slug, objekt);
  return isObjektOwned(objekt) ? `${base} #${objekt.serial}` : base;
}

/** A strip below `md`, so Cancel and Add stay on a phone's screen; three columns beside the grid. */
function TickedList({
  ticked,
  onUntick,
  onEmptied,
}: {
  ticked: Ticked;
  onUntick: (key: string, objekt: ValidObjekt) => void;
  onEmptied: () => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  // the pressed button leaves with its card, so focus moves to a neighbour that stays
  const untick = (index: number, key: string, objekt: ValidObjekt) => {
    const buttons = listRef.current?.querySelectorAll("button") ?? [];
    const next = buttons[index + 1] ?? buttons[index - 1];
    if (next) next.focus();
    else onEmptied();
    onUntick(key, objekt);
  };
  return (
    <ul
      ref={listRef}
      data-scroll-x
      className="flex min-h-0 gap-1.5 overflow-x-auto max-md:pb-1 md:grid md:flex-1 md:grid-cols-3 md:content-start md:overflow-x-visible md:overflow-y-auto"
    >
      {[...ticked].map(([key, objekt], index) => (
        <li key={key} className="@container relative min-w-0 max-md:w-14 max-md:shrink-0">
          <ObjektCard objekt={objekt} image="thumbnail" hideLabel />
          <button
            type="button"
            aria-label={m.trade_composer_add_untick({ name: tickedName(objekt) })}
            onClick={() => untick(index, key, objekt)}
            className="bg-background hover:bg-muted focus-visible:ring-ring absolute end-0.5 top-0.5 z-10 grid size-6 place-items-center rounded-full border shadow-xs outline-none focus-visible:ring-2"
          >
            <XIcon className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** What the bound profile holds, one card per copy, keyed by token id. */
function OwnedGrid({ address, filters, ticked, onToggle }: GridProps & { address: string }) {
  // a failed read shows in the sheet, not the page's error boundary
  const query = useInfiniteQuery({ ...ownedCollectionOptions(address), throwOnError: false });
  // the filters run in the browser, so they need every page
  const filtering = pickerFiltered(filters);
  useLoadAllPages(filtering, query);

  if (query.isPending) return <GridSkeleton />;
  const all = query.data?.pages.flatMap((page) => page.objekts) ?? [];
  if (all.length === 0) {
    if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
    return (
      <EmptyState
        icon={CardsThreeIcon}
        bordered={false}
        title={m.trade_composer_add_no_objekts()}
      />
    );
  }
  const rows = filtering ? filterObjekts(toFilterSearch(filters), all) : all;
  if (rows.length === 0 && !query.hasNextPage) return <NoMatch />;

  return (
    <VirtualCardGrid
      sections={[{ title: null, items: rows }]}
      getKey={(objekt) => objekt.id}
      more={{
        has: query.hasNextPage,
        loading: query.isFetchingNextPage,
        failed: query.isFetchNextPageError,
        load: () => void query.fetchNextPage(),
      }}
      renderItem={(objekt) => (
        <ObjektCard
          objekt={objekt}
          image="thumbnail"
          selected={ticked.has(objekt.id)}
          onToggleSelect={() => onToggle(objekt.id, objekt)}
          onOpen={() => onToggle(objekt.id, objekt)}
        />
      )}
    />
  );
}

/** Every collection of the selected artists, as the index has them, keyed by slug. */
function CollectionGrid({ filters, ticked, onToggle }: GridProps) {
  const { selectedArtistIds } = useCosmoArtist();
  // the option throws to the page's error boundary, which a sheet must not take down
  const query = useQuery({
    ...collectionOptions({ artist: selectedArtistIds }),
    throwOnError: false,
  });

  if (query.isPending) return <GridSkeleton />;
  if (query.isError) return <LoadError onRetry={() => void query.refetch()} />;
  const all = query.data;
  if (all.length === 0) {
    return (
      <EmptyState
        icon={CardsThreeIcon}
        bordered={false}
        title={m.trade_composer_add_no_collections()}
      />
    );
  }
  const rows = pickerFiltered(filters) ? filterObjekts(toFilterSearch(filters), all) : all;
  if (rows.length === 0) return <NoMatch />;

  return (
    <VirtualCardGrid
      sections={[{ title: null, items: rows }]}
      getKey={(objekt) => objekt.slug}
      renderItem={(objekt) => (
        <ObjektCard
          objekt={objekt}
          image="thumbnail"
          selected={ticked.has(objekt.slug)}
          onToggleSelect={() => onToggle(objekt.slug, objekt)}
          onOpen={() => onToggle(objekt.slug, objekt)}
        />
      )}
    />
  );
}

function NoMatch() {
  return (
    <EmptyState icon={CardsThreeIcon} bordered={false} title={m.trade_composer_add_no_match()} />
  );
}
