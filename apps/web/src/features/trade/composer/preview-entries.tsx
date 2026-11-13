import { CurrencyDollarIcon, ScalesIcon, TrashIcon } from "@phosphor-icons/react";
import type { ListObjekt } from "@repo/lib/types/objekt";
import { type ReactNode, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { useEditList } from "@/features/list/actions";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { type StoredList, toDraft, toEditInput } from "@/features/list/list-draft";
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
import { ObjektCard, RATIO_ON_CARD } from "@/features/objekt/objekt-card";
import { m } from "@/paraglide/messages";

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
}: {
  entry: ListObjekt;
  side: RatioSide | null;
  listRatio: number | null;
  actions: EntryActions;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const applied = side ? appliedRatio(entry.ratio, listRatio) : null;
  const name = collectionName(entry.slug, entry);
  const { price, ratio, remove } = actions;
  const run = (action: EntryAction) => {
    if (trigger.current) action(entry, trigger.current);
  };

  return (
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
}
