import { type CandidateItem, OFFER_SIDE_LIMIT, type PartnerList } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

import { type GetSource, addLabel, pickerDescription } from "./get-source";
import { MineGrid, TheirCollectionGrid, TheirsGrid } from "./offer-picker-grids";
import { type Collections, type OfferPick, type OfferSide, pickKey, toPick } from "./pick";
import { PickerSelectionContext } from "./picker-selection";
import { copiesLeft, countOf, totalOf, withCount } from "./quantity";
import type { OfferAddress } from "./queries";

/** The partner's offer rules the pickers follow. */
export type PickerRules = {
  wantedOnly: boolean;
  /** the post's own want list, which You give's picker keeps to under `wantedOnly` */
  wantList?: string;
  /** the post the offer is on, the one You get's picker shows */
  post?: { slug: string; name: string };
};

export function OfferPicker({
  open,
  onOpenChange,
  side,
  to,
  name,
  source,
  theirLists,
  startList,
  rules,
  picked,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: OfferSide;
  to: OfferAddress;
  name: string;
  source: GetSource;
  theirLists: PartnerList[];
  startList?: string;
  rules?: PickerRules;
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* full screen below `lg`; from `lg` as wide as the main area, so the column stays in view.
          A set height gives the grid a bounded scroller */}
      <SheetPopup
        side="right"
        className="h-full w-full max-w-none lg:w-[min(calc(100vw-(--spacing(96))),80rem)]"
        // the column beside the sheet stays readable: dimmed, not blurred
        portalProps={{ className: "*:data-[slot=sheet-backdrop]:backdrop-blur-none" }}
      >
        <PickerBody
          side={side}
          to={to}
          name={name}
          source={source}
          theirLists={theirLists}
          startList={startList}
          rules={rules}
          picked={picked}
          onDone={onDone}
        />
      </SheetPopup>
    </Sheet>
  );
}

function PickerBody({
  side,
  to,
  name,
  source,
  theirLists,
  startList,
  rules,
  picked,
  onDone,
}: {
  side: OfferSide;
  to: OfferAddress;
  name: string;
  source: GetSource;
  theirLists: PartnerList[];
  startList?: string;
  rules?: PickerRules;
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  const [selection, setSelection] = useState(() => new Map(picked.map((p) => [p.key, p])));
  const seen = useRef<Record<string, ValidObjekt>>({});
  const total = totalOf(selection.values());
  const full = total >= OFFER_SIDE_LIMIT;
  const fullId = useId();

  const remember = (item: CandidateItem, collections: Collections) => {
    const collection = collections[item.collectionSlug];
    if (collection) seen.current[item.collectionSlug] = collection;
  };

  // an any-copy item asks for as many copies as they spare, bar those picked by serial
  const copiesOf = (picks: Map<string, OfferPick>, item: CandidateItem) =>
    copiesLeft(picks.values(), item.collectionSlug, item.copies ?? 1);

  const toggle = (item: CandidateItem, collections: Collections) => {
    const key = pickKey(item);
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else if (
        totalOf(next.values()) < OFFER_SIDE_LIMIT &&
        (item.objektId !== null || copiesOf(next, item) > 0)
      ) {
        next.set(key, toPick(item));
      }
      return next;
    });
    remember(item, collections);
  };

  const setCount = (item: CandidateItem, count: number, collections: Collections) => {
    setSelection((current) =>
      withCount(current, toPick(item), count, copiesOf(current, item), OFFER_SIDE_LIMIT),
    );
    remember(item, collections);
  };

  const selected = {
    isSelected: (item: CandidateItem) => selection.has(pickKey(item)),
    countOf: (item: CandidateItem) => countOf(selection.get(pickKey(item)) ?? { count: 0 }),
    copiesOf: (item: CandidateItem) => copiesOf(selection, item),
    full,
    fullId,
    onToggle: toggle,
    onCount: setCount,
  };

  return (
    <PickerSelectionContext value={selected}>
      <SheetHeader>
        <SheetTitle className="font-display pe-8">
          {addLabel(side, source, name, rules?.post?.name)}
        </SheetTitle>
        <SheetDescription className="max-sm:sr-only">
          {pickerDescription(side, source, name)}
        </SheetDescription>
      </SheetHeader>
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
        {side === "give" ? (
          <MineGrid to={to} name={name} wantedOnly={rules?.wantedOnly} wantList={rules?.wantList} />
        ) : source === "collection" ? (
          <TheirCollectionGrid to={to} name={name} />
        ) : (
          <TheirsGrid
            to={to}
            name={name}
            lists={theirLists}
            startList={startList}
            post={rules?.post?.slug}
          />
        )}
      </div>
      <SheetFooter className="flex-row items-center">
        <p className="text-muted-foreground me-auto text-xs" aria-live="polite">
          {m.offer_picker_count({
            count: formatCount(total),
            max: OFFER_SIDE_LIMIT,
          })}
          {full ? (
            <span id={fullId} className="block">
              {m.offer_picker_full()}
            </span>
          ) : null}
        </p>
        <SheetClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</SheetClose>
        <Button onClick={() => onDone([...selection.values()], { ...seen.current })}>
          {m.offer_picker_done()}
        </Button>
      </SheetFooter>
    </PickerSelectionContext>
  );
}
