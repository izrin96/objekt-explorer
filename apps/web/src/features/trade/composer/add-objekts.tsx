import { CardsThreeIcon, CaretUpIcon, InfoIcon, LinkIcon } from "@phosphor-icons/react";
import { canBeOnTrade } from "@repo/api/schemas/list";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { SheetClose, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { toastManager } from "@/components/ui/toast";
import { LoadError } from "@/features/chat/attach/attach-picker-parts";
import { PickerFilterBar } from "@/features/filters/picker-filter-bar";
import { NO_PICKER_FILTERS } from "@/features/filters/picker-filters";
import { useAddToList } from "@/features/list/actions";
import { addedToast, profileLabel } from "@/features/list/add-to-list-text";
import type { StoredList } from "@/features/list/list-draft";
import { PriceFields, type PriceValue } from "@/features/list/price-fields";
import { listFindOptions } from "@/features/list/queries";
import { CardGridSkeleton } from "@/features/objekt/card-grid";
import { formatCurrency } from "@/features/settings/currency-format";
import { useUserProfiles } from "@/features/user/hooks";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

import { CollectionGrid, OwnedGrid } from "./add-objekts-grids";
import { addObjektsRequest, addSourceOf } from "./add-objekts-request";
import { type Ticked, TickedTray } from "./ticked-tray";

/**
 * Add objekts on a picked side: the filters across the top, the grid, and the Ticked tray beside
 * it from `md`; below, a bar whose popovers hold the tray and the price, so the grid keeps the
 * screen. Adding saves to the list at once and closes.
 */
export function AddObjektsSheet({
  slug,
  name,
  onDone,
  focusTitle = false,
}: {
  slug: string;
  name: string;
  onDone: () => void;
  /** set when this replaces another sheet's content: no popup opens, so nothing else moves focus */
  focusTitle?: boolean;
}) {
  const stored = useQuery(listFindOptions(slug, true));
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusTitle) title.current?.focus();
  }, [focusTitle]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-6">
      {/* one element through loading and loaded, so focus on it survives the list arriving */}
      <SheetTitle ref={title} tabIndex={-1} className="font-display pe-8 text-lg outline-none">
        {m.trade_composer_add_title({ list: name })}
      </SheetTitle>
      {stored.data ? (
        <AddObjektsBody list={stored.data} name={name} onDone={onDone} />
      ) : stored.isError ? (
        <LoadError onRetry={() => void stored.refetch()} />
      ) : (
        <CardGridSkeleton />
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
  const sale = list.listType === "sale";
  const tray = { ticked, onUntick: toggle, onClear: () => setTicked(new Map()) };
  const priceFields = sale ? (
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
  ) : null;
  const addButton = (
    <Button className="flex-1" disabled={count === 0} loading={add.isPending} onClick={submit}>
      {count === 0
        ? m.list_manage_objekt_add_button()
        : m.trade_composer_add_button({ count: formatCount(count) })}
    </Button>
  );

  return (
    <>
      {/* a phone needs the room for the grid; screen readers still get it */}
      {/* -mt-2: the title is a sibling in the sheet's gap-3 column, and the pair reads as one block */}
      <SheetDescription className="-mt-2 text-pretty max-md:sr-only">
        {owner !== null
          ? m.trade_composer_add_source_owned({ profile: profileName(owner) })
          : source === "collections"
            ? m.trade_composer_add_source_want()
            : m.trade_composer_add_unbound()}
      </SheetDescription>
      {onTrade ? (
        <>
          <Alert variant="warning" role="status" className="max-md:hidden">
            <InfoIcon aria-hidden />
            <AlertDescription>{m.trade_composer_add_on_trade({ list: name })}</AlertDescription>
          </Alert>
          <p className="text-muted-foreground flex items-start gap-1.5 text-xs text-pretty md:hidden">
            <InfoIcon aria-hidden className="text-warning mt-px size-3.5 shrink-0" />
            {m.trade_composer_add_on_trade({ list: name })}
          </p>
        </>
      ) : null}
      <PickerFilterBar filters={filters} onChange={setFilters} />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3 md:grid-cols-[minmax(0,1fr)_16rem] md:grid-rows-1 md:gap-4">
        <div className="flex min-h-0 flex-col">
          {owner !== null ? (
            <OwnedGrid address={owner} {...gridProps} />
          ) : source === "collections" ? (
            <CollectionGrid {...gridProps} />
          ) : (
            <EmptyState icon={LinkIcon} bordered={false} title={m.trade_composer_add_unbound()} />
          )}
        </div>
        <aside className="flex min-h-0 flex-col gap-3 border-s ps-4 max-md:hidden">
          <TickedTray {...tray} scrollClassName="flex-1" listClassName="grid-cols-3" />
          {priceFields ? <div className="flex flex-col gap-3">{priceFields}</div> : null}
          <div className="flex gap-2">
            <SheetClose render={<Button variant="outline" className="flex-1" />}>
              {m.common_modal_cancel()}
            </SheetClose>
            {addButton}
          </div>
        </aside>
        {/* below md the sheet's close button stands in for Cancel */}
        <div className="flex min-w-0 items-center gap-2 border-t pt-3 md:hidden">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="shrink-0" />}>
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
          {priceFields ? (
            <Popover>
              <PopoverTrigger render={<Button variant="outline" className="min-w-0 shrink" />}>
                <PriceButtonLabel summary={priceSummary(price, list.currency ?? "")} />
                <CaretUpIcon aria-hidden className="size-3.5 shrink-0 opacity-60" />
              </PopoverTrigger>
              <PopoverPopup side="top" className="w-80 max-w-full">
                <div className="flex flex-col gap-3">{priceFields}</div>
              </PopoverPopup>
            </Popover>
          ) : null}
          {addButton}
        </div>
      </div>
    </>
  );
}

/** "MYR 5 · Note" once set, so the bar shows what Add will apply. */
function priceSummary({ price, isQyop, note }: PriceValue, currency: string) {
  const parts = [
    isQyop
      ? m.list_manage_objekt_set_price_qyop()
      : price !== null
        ? formatCurrency(price, currency)
        : null,
    note.trim() ? m.list_manage_objekt_set_price_note() : null,
  ].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** The summary alone would leave the button's name as just "QYOP", so the label stays for screen readers. */
function PriceButtonLabel({ summary }: { summary: string | null }) {
  if (summary === null)
    return <span className="truncate">{m.trade_composer_add_price_note()}</span>;
  return (
    <span className="truncate">
      <span className="sr-only">{m.trade_composer_add_price_note()}: </span>
      {summary}
    </span>
  );
}
