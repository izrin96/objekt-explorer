import { type CandidateItem, OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  NO_PICKER_FILTERS,
  PickerFilterBar,
  pickerFiltered,
} from "@/features/filters/picker-filter-bar";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { m } from "@/paraglide/messages";

import { CandidateGrid, candidateMatcher, pagedGridProps } from "./candidate-grid";
import { type Collections, type OfferPick, type OfferSide, pickKey, toPick } from "./pick";
import {
  myCandidatesOptions,
  type OfferAddress,
  type PickerFilters,
  theirPickerOptions,
} from "./queries";

export function OfferPicker({
  open,
  onOpenChange,
  side,
  to,
  name,
  picked,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: OfferSide;
  to: OfferAddress;
  name: string;
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="h-[min(48rem,calc(100dvh-(--spacing(8))))] max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        <PickerBody side={side} to={to} name={name} picked={picked} onDone={onDone} />
      </DialogPopup>
    </Dialog>
  );
}

function PickerBody({
  side,
  to,
  name,
  picked,
  onDone,
}: {
  side: OfferSide;
  to: OfferAddress;
  name: string;
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  const [selection, setSelection] = useState(() => new Map(picked.map((p) => [p.key, p])));
  const [seen, setSeen] = useState<Record<string, ValidObjekt>>({});
  const full = selection.size >= OFFER_SIDE_LIMIT;

  const toggle = (item: CandidateItem, collections: Collections) => {
    const key = pickKey(item);
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else if (next.size < OFFER_SIDE_LIMIT) next.set(key, toPick(item));
      return next;
    });
    const collection = collections[item.collectionSlug];
    if (collection) setSeen((current) => ({ ...current, [item.collectionSlug]: collection }));
  };

  const grid = {
    isSelected: (item: CandidateItem) => selection.has(pickKey(item)),
    full,
    onToggle: toggle,
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {side === "give" ? m.offer_add_mine() : m.offer_add_theirs({ name })}
        </DialogTitle>
        <DialogDescription>
          {side === "give" ? m.offer_picker_mine_desc() : m.offer_picker_theirs_desc({ name })}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
        {side === "give" ? (
          <MineGrid to={to} {...grid} />
        ) : (
          <TheirsGrid to={to} name={name} {...grid} />
        )}
      </div>
      <DialogFooter className="sm:items-center">
        <p
          className="text-muted-foreground font-mono text-xs tabular-nums sm:me-auto"
          aria-live="polite"
        >
          {m.offer_picker_count({ count: selection.size, max: OFFER_SIDE_LIMIT })}
        </p>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button onClick={() => onDone([...selection.values()], seen)}>
          {m.offer_picker_done()}
        </Button>
      </DialogFooter>
    </>
  );
}

type GridProps = {
  to: OfferAddress;
  isSelected: (item: CandidateItem) => boolean;
  full: boolean;
  onToggle: (item: CandidateItem, collections: Collections) => void;
};

type Filters = PickerFilters & { search: string };

// both switches start off, so a picker never opens on nothing
const NO_FILTERS: Filters = { ...NO_PICKER_FILTERS, matchOnly: false };

const narrowed = (filters: Filters) => filters.matchOnly || pickerFiltered(filters);

/** The side's own "only what matches" switch, after the shared filters. */
function MatchSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const id = useId();
  return (
    <span className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
    </span>
  );
}

function MineGrid({ to, ...grid }: GridProps) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const query = useInfiniteQuery(myCandidatesOptions(to, filters));
  useLoadAllPages(filters.search.trim().length > 0, query);

  const pages = query.data?.pages ?? [];
  const collections: Collections = Object.assign({}, ...pages.map((page) => page.collections));
  const match = candidateMatcher(filters.search, collections);
  const allSuggested = pages[0]?.suggested ?? [];
  const suggested = match ? allSuggested.filter(match) : allSuggested;
  const items = pages.flatMap((page) => page.items);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar filters={filters} onChange={setFilters}>
        <MatchSwitch
          checked={filters.matchOnly}
          onChange={(matchOnly) => setFilters({ ...filters, matchOnly })}
          label={m.offer_picker_only_they_want()}
        />
      </PickerFilterBar>
      <CandidateGrid
        {...grid}
        {...pagedGridProps(query, items.length)}
        sections={[
          { title: m.offer_picker_suggested(), items: suggested },
          {
            title: suggested.length > 0 ? m.offer_picker_all_mine() : null,
            items: match ? items.filter(match) : items,
          },
        ]}
        collections={collections}
        empty={
          narrowed(filters)
            ? { title: m.offer_picker_filtered() }
            : { title: m.offer_picker_mine_empty() }
        }
      />
    </div>
  );
}

function TheirsGrid({ to, name, ...grid }: GridProps & { name: string }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const query = useInfiniteQuery(theirPickerOptions(to, filters));
  useLoadAllPages(filters.search.trim().length > 0, query);

  const pages = query.data?.pages ?? [];
  const collections: Collections = Object.assign({}, ...pages.map((page) => page.collections));
  const match = candidateMatcher(filters.search, collections);
  const items = pages.flatMap((page) => page.items);
  const listed = pages[0]?.listed ?? true;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar filters={filters} onChange={setFilters}>
        <MatchSwitch
          checked={filters.matchOnly}
          onChange={(matchOnly) => setFilters({ ...filters, matchOnly })}
          label={m.offer_picker_only_i_want()}
        />
      </PickerFilterBar>
      <CandidateGrid
        {...grid}
        {...pagedGridProps(query, items.length)}
        sections={[{ title: null, items: match ? items.filter(match) : items }]}
        collections={collections}
        empty={
          // nothing listed is the reason whatever the filters
          !listed
            ? {
                title: m.offer_picker_theirs_none_listed({ name }),
                hint: m.offer_picker_theirs_none_listed_hint(),
              }
            : narrowed(filters)
              ? { title: m.offer_picker_filtered() }
              : {
                  title: m.offer_picker_theirs_none_held({ name }),
                  hint: m.offer_picker_theirs_none_held_hint(),
                }
        }
      />
    </div>
  );
}
