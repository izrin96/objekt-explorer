import { CurrencyDollarIcon, ScalesIcon, TrashIcon } from "@phosphor-icons/react";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { SheetDescription, SheetHeader, SheetPanel, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useEditList } from "@/features/list/actions";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { type StoredList, toDraft, toEditInput } from "@/features/list/list-draft";
import { formatPrice } from "@/features/list/list-price";
import { listEntriesOptions, listFindOptions } from "@/features/list/queries";
import { RatioChip } from "@/features/list/ratio-chip";
import { RatioPicker } from "@/features/list/ratio-picker";
import {
  appliedRatio,
  type RatioSide,
  ratioLabel,
  ratioName,
  ratioText,
} from "@/features/list/ratio-text";
import { collectionName } from "@/features/objekt/collection-name";
import { ObjektCard, PriceCaption, RATIO_ON_CARD } from "@/features/objekt/objekt-card";
import { SelectBar, type SelectBarAction, SelectModeButton } from "@/features/objekt/select-bar";
import { SelectedMark } from "@/features/objekt/selected-mark";
import { PanelCardGrid } from "@/features/objekt/virtual-card-grid";
import { LoadError } from "@/features/trade/load-error";
import { activateOnKey } from "@/lib/a11y";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";
import { selectIsSelecting, useSelection } from "@/stores/selection";

import { useSideDialogs } from "./use-side-dialogs";

/**
 * Add to list for one side's objekts, as the list page offers it: a bound list's objekts may also
 * go to that profile's other bound lists, and a hide-serial one's are added by entry.
 */
export function SideAddToList({
  stored,
  children,
}: {
  stored: StoredList | undefined;
  children: ReactNode;
}) {
  const bound = stored?.isProfileBind === true;
  return (
    <AddToListProvider
      address={bound ? (stored.profileAddress ?? undefined) : undefined}
      sourceList={bound && stored.hideSerial ? stored.slug : undefined}
    >
      {children}
    </AddToListProvider>
  );
}

/** "Ratio for all" by the list's name: `list.edit` takes the whole list, so it starts from the stored one. */
export function ListRatioControl({ stored, side }: { stored: StoredList; side: RatioSide }) {
  const edit = useEditList(m.ratio_set_success);
  const [open, setOpen] = useState(false);
  const ratio = stored.ratio ?? null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="outline" size="xs" className="self-start" />}
        aria-label={m.trade_composer_list_ratio_set({
          ratio: ratio === null ? m.ratio_none_name() : ratioLabel(ratio, side, { owner: true }),
        })}
      >
        {m.ratio_for_all()}
        <span>{ratio === null ? "1:1" : ratioText(ratio, side)}</span>
      </PopoverTrigger>
      <PopoverPopup className="w-80" align="start">
        <RatioPicker
          side={side}
          label={m.ratio_for_all()}
          description={side === "have" ? m.ratio_for_all_have_desc() : m.ratio_for_all_want_desc()}
          value={ratio}
          disabled={edit.isPending}
          onChange={(next) =>
            edit.mutate(toEditInput(stored.slug, { ...toDraft(stored), ratio: next }, ratio), {
              onSuccess: () => setOpen(false),
            })
          }
        />
      </PopoverPopup>
    </Popover>
  );
}

type EntryAction = (entry: ListObjekt, thumb: HTMLElement) => void;

/** what a thumbnail's menu offers; null where the side takes no price or ratio */
export type EntryActions = {
  price: EntryAction | null;
  ratio: EntryAction | null;
  remove: EntryAction;
};

/** A thumbnail opening the list page's entry actions for its objekt. */
export function EntryThumb({
  entry,
  side,
  listRatio,
  actions,
  currency,
}: {
  entry: ListObjekt;
  side: RatioSide | null;
  listRatio: number | null;
  actions: EntryActions;
  /** a sale side's, to draw the price under the card; the preview's thumbnails are too small for it */
  currency?: string | null;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const applied = side ? appliedRatio(entry.ratio, listRatio) : null;
  const name = collectionName(entry.slug, entry);
  const { price, ratio, remove } = actions;
  const run = (action: EntryAction) => {
    if (trigger.current) action(entry, trigger.current);
  };

  const menu = (
    <Menu>
      <MenuTrigger
        ref={trigger}
        data-entry-thumb={String(entry.entryId)}
        aria-label={
          applied && side
            ? m.trade_composer_objekt_options_ratio({
                name,
                ratio: ratioLabel(applied.ratio, side, {
                  owner: true,
                  inherited: applied.inherited,
                }),
              })
            : m.trade_composer_objekt_options({ name })
        }
        // the chip lies inert over the card, so the trigger carries its tooltip
        title={
          applied && side
            ? ratioName(applied.ratio, side, { owner: true, inherited: applied.inherited })
            : undefined
        }
        className="rounded-photocard focus-visible:ring-ring @container relative block w-full cursor-pointer outline-none focus-visible:ring-2"
      >
        <ObjektCard objekt={entry} image="thumbnail" hideLabel />
        {applied && side ? (
          <RatioChip
            ratio={applied.ratio}
            side={side}
            owner
            inherited={applied.inherited}
            className={RATIO_ON_CARD}
          />
        ) : null}
      </MenuTrigger>
      <MenuPopup align="start" className="min-w-44">
        <AddToListMenuItem objekts={[entry]} />
        {price ? (
          <MenuItem onClick={() => run(price)}>
            <CurrencyDollarIcon />
            {m.objekt_menu_set_price()}
          </MenuItem>
        ) : null}
        {ratio ? (
          <MenuItem onClick={() => run(ratio)}>
            <ScalesIcon />
            {m.objekt_menu_set_ratio()}
          </MenuItem>
        ) : null}
        <MenuSeparator />
        <MenuItem variant="destructive" onClick={() => run(remove)}>
          <TrashIcon />
          {m.objekt_menu_remove_from_list()}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
  if (!currency || !price) return menu;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {menu}
      <PriceCaption
        price={formatPrice(currency, entry, true)}
        priceMuted={entry.price === null && !entry.isQyop}
        note={entry.note}
        onPriceClick={() => run(price)}
      />
    </div>
  );
}

/** A thumbnail in select mode: a tap ticks it, as the Add objekts picker's tiles do. */
function SelectThumb({ entry, ticked }: { entry: ListObjekt; ticked: boolean }) {
  const toggle = useSelection((s) => s.toggle);
  const onToggle = () => toggle(entry.id);
  // not a `<button>`: WebKit collapses the card's `aspect-ratio` box inside one
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={ticked}
      aria-label={collectionName(entry.slug, entry)}
      onClick={onToggle}
      onKeyDown={(event) => activateOnKey(event, onToggle)}
      className="focus-visible:ring-ring @container relative cursor-pointer rounded-md outline-none focus-visible:ring-2"
    >
      <ObjektCard objekt={entry} image="thumbnail" hideLabel />
      {ticked ? <SelectedMark /> : null}
    </div>
  );
}

/** "+N": every objekt of a side, each opening the menu its thumbnail opens in the preview. */
export function AllObjekts({
  slug,
  name,
  ratio,
  select,
}: {
  slug: string;
  name: string;
  ratio: RatioSide | null;
  /** opens in select mode, for a side's Select button */
  select: boolean;
}) {
  const { data: stored } = useQuery(listFindOptions(slug, true));
  const entriesQuery = useQuery(listEntriesOptions(slug, []));
  const entries = entriesQuery.data;
  const title = useRef<HTMLHeadingElement>(null);
  const { actions, bulkActions, dialogs, currency } = useSideDialogs({
    slug,
    stored,
    side: ratio,
    fallback: title,
  });
  const listRatio = stored?.ratio ?? null;
  const count = formatCount(entries?.length ?? 0);

  const ids = useSelection((s) => s.ids);
  const selecting = useSelection(selectIsSelecting);
  // the store spans every surface and the composer never navigates while the sheet is up, so each
  // sheet starts and ends with a clean selection
  useEffect(() => {
    const { clear, enter } = useSelection.getState();
    clear();
    if (select) enter();
    return clear;
  }, [select]);
  const selected = entries?.filter((entry) => ids.has(entry.id)) ?? [];
  const bulk: SelectBarAction[] = [
    {
      label: m.filter_remove_from_list(),
      icon: <TrashIcon />,
      onClick: () => bulkActions.remove(selected),
    },
    ...(bulkActions.price
      ? [
          {
            label: m.filter_set_price(),
            icon: <CurrencyDollarIcon />,
            onClick: () => bulkActions.price?.(selected),
          },
        ]
      : []),
    ...(bulkActions.ratio
      ? [
          {
            label: m.filter_set_ratio(),
            icon: <ScalesIcon />,
            onClick: () => bulkActions.ratio?.(selected),
          },
        ]
      : []),
  ];

  return (
    <SideAddToList stored={stored}>
      <SheetHeader>
        <div className="flex items-start justify-between gap-3 pe-7">
          <SheetTitle ref={title} tabIndex={-1} className="font-display outline-none">
            {m.trade_composer_all_title()}
          </SheetTitle>
          {entries && entries.length > 0 ? <SelectModeButton /> : null}
        </div>
        {/* the count only once it is known, never a 0 while loading */}
        <SheetDescription>
          {entries === undefined
            ? name
            : selecting
              ? m.trade_composer_all_select_desc({ count, list: name })
              : m.trade_composer_all_desc({ count, list: name })}
        </SheetDescription>
      </SheetHeader>
      <SheetPanel data-entry-grid="">
        {entriesQuery.isError ? (
          <LoadError
            bordered={false}
            error={entriesQuery.error}
            onRetry={() => void entriesQuery.refetch()}
          />
        ) : entriesQuery.isPending ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="rounded-photocard aspect-photocard" />
            ))}
          </div>
        ) : (
          <PanelCardGrid
            sections={[{ title: null, items: entries ?? [] }]}
            getKey={(entry) => String(entry.entryId)}
            renderItem={(entry) =>
              selecting ? (
                <SelectThumb entry={entry} ticked={ids.has(entry.id)} />
              ) : (
                <EntryThumb
                  entry={entry}
                  side={ratio}
                  listRatio={listRatio}
                  actions={actions}
                  currency={currency}
                />
              )
            }
          />
        )}
      </SheetPanel>
      {selecting ? (
        <div className="flex px-6 pt-3 pb-6">
          <SelectBar objekts={entries ?? []} secondary={bulk}>
            <AddToListAction objekts={entries ?? []} />
          </SelectBar>
        </div>
      ) : null}
      {dialogs}
    </SideAddToList>
  );
}
