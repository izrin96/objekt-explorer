import type { ListType } from "@repo/api/schemas/list";
import { type CandidateItem, OFFER_SIDE_LIMIT, type PartnerList } from "@repo/api/schemas/offer";
import type { PickerTag } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type ReactNode, useId, useState } from "react";

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
import { SingleSelect } from "@/features/filters/single-select";
import { listOption } from "@/features/list/list-option";
import { useUserLists } from "@/features/user/hooks";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { m } from "@/paraglide/messages";

import {
  CandidateGrid,
  PickerSelectionContext,
  candidateMatcher,
  pagedGridProps,
} from "./candidate-grid";
import { type GetSource, addLabel, pickerDescription } from "./get-source";
import { type Collections, type OfferPick, type OfferSide, pickKey, toPick } from "./pick";
import { copiesLeft, countOf, totalOf, withCount } from "./quantity";
import {
  myCandidatesOptions,
  type OfferAddress,
  type PickerFilters,
  theirCollectionOptions,
  theirPickerOptions,
} from "./queries";

export function OfferPicker({
  open,
  onOpenChange,
  side,
  to,
  name,
  source,
  theirLists,
  startList,
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
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="h-[min(48rem,calc(100dvh-(--spacing(8))))] max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        <PickerBody
          side={side}
          to={to}
          name={name}
          source={source}
          theirLists={theirLists}
          startList={startList}
          picked={picked}
          onDone={onDone}
        />
      </DialogPopup>
    </Dialog>
  );
}

function PickerBody({
  side,
  to,
  name,
  source,
  theirLists,
  startList,
  picked,
  onDone,
}: {
  side: OfferSide;
  to: OfferAddress;
  name: string;
  source: GetSource;
  theirLists: PartnerList[];
  startList?: string;
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  const [selection, setSelection] = useState(() => new Map(picked.map((p) => [p.key, p])));
  const [seen, setSeen] = useState<Record<string, ValidObjekt>>({});
  const total = totalOf(selection.values());
  const full = total >= OFFER_SIDE_LIMIT;
  const fullId = useId();

  const remember = (item: CandidateItem, collections: Collections) => {
    const collection = collections[item.collectionSlug];
    if (collection) setSeen((current) => ({ ...current, [item.collectionSlug]: collection }));
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
      <DialogHeader>
        <DialogTitle className="font-display">{addLabel(side, source, name)}</DialogTitle>
        <DialogDescription className="max-sm:sr-only">
          {pickerDescription(side, source, name)}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
        {side === "give" ? (
          <MineGrid to={to} name={name} />
        ) : source === "collection" ? (
          <TheirCollectionGrid to={to} name={name} />
        ) : (
          <TheirsGrid to={to} name={name} lists={theirLists} startList={startList} />
        )}
      </div>
      <DialogFooter className="flex-row items-center">
        <p className="text-muted-foreground me-auto text-xs tabular-nums" aria-live="polite">
          {m.offer_picker_count({ count: total, max: OFFER_SIDE_LIMIT })}
          {full ? (
            <span id={fullId} className="block">
              {m.offer_picker_full()}
            </span>
          ) : null}
        </p>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button onClick={() => onDone([...selection.values()], seen)}>
          {m.offer_picker_done()}
        </Button>
      </DialogFooter>
    </PickerSelectionContext>
  );
}

type GridProps = { to: OfferAddress };

type Filters = PickerFilters & { search: string };

// both switches start off, so a picker never opens on nothing
const NO_FILTERS: Filters = { ...NO_PICKER_FILTERS, matchOnly: false };

const narrowed = (filters: Filters) => filters.matchOnly || pickerFiltered(filters);

/**
 * Nothing left: the match switch alone says what it kept out, with the way to turn it off;
 * other filters get the plain wording.
 */
function narrowedEmpty(
  filters: Filters,
  onFilters: (filters: Filters) => void,
  matchTitle: string,
) {
  if (filters.matchOnly && !pickerFiltered(filters)) {
    return {
      title: matchTitle,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilters({ ...filters, matchOnly: false })}
        >
          {m.offer_picker_match_off()}
        </Button>
      ),
    };
  }
  return { title: m.offer_picker_filtered() };
}

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

const ALL = "all";

type ListChoice = { slug: string; name: string; type: ListType };

/** A picked list that has since left `lists` reads as All again. */
function useListChoice(lists: readonly ListChoice[], start = ALL) {
  const [picked, setList] = useState(start);
  const fromList = lists.some((list) => list.slug === picked) ? picked : undefined;
  return [fromList, setList] as const;
}

function ListSelect({
  lists,
  allLabel,
  value,
  onChange,
}: {
  lists: readonly ListChoice[];
  allLabel: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <SingleSelect
      label={m.offer_picker_list()}
      options={[{ value: ALL, label: allLabel }, ...lists.map(listOption)]}
      value={value ?? ALL}
      defaultValue={ALL}
      onChange={onChange}
    />
  );
}

type Pages = {
  items: CandidateItem[];
  suggested: CandidateItem[];
  collections: Collections;
  tags?: Record<string, PickerTag>;
};

/** The filter bar and the grid over one candidates query; each picker supplies its query and wording. */
function PickerGrid({
  query,
  filters,
  onFilters,
  source,
  sourceActive = false,
  matchLabel,
  suggestedTitle,
  allTitle,
  empty,
}: {
  query: Parameters<typeof pagedGridProps>[0] & { data?: { pages: Pages[] } };
  filters: Filters;
  onFilters: (filters: Filters) => void;
  source?: ReactNode;
  /** a List other than All is picked, for the folded filters' count on phones */
  sourceActive?: boolean;
  matchLabel: string;
  suggestedTitle?: string;
  allTitle?: string;
  empty: { title: string; hint?: string };
}) {
  useLoadAllPages(filters.search.trim().length > 0, query);
  const pages = query.data?.pages ?? [];
  const collections: Collections = Object.assign({}, ...pages.map((page) => page.collections));
  const match = candidateMatcher(filters.search, collections);
  const allSuggested = pages[0]?.suggested ?? [];
  const suggested = match ? allSuggested.filter(match) : allSuggested;
  const items = pages.flatMap((page) => page.items);
  const tags: Record<string, PickerTag> = Object.assign({}, ...pages.map((page) => page.tags));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar
        filters={filters}
        onChange={onFilters}
        source={source}
        extraActive={(filters.matchOnly ? 1 : 0) + (sourceActive ? 1 : 0)}
      >
        <MatchSwitch
          checked={filters.matchOnly}
          onChange={(matchOnly) => onFilters({ ...filters, matchOnly })}
          label={matchLabel}
        />
      </PickerFilterBar>
      <CandidateGrid
        {...pagedGridProps(query, items.length + allSuggested.length)}
        sections={[
          { title: suggestedTitle ?? null, items: suggested },
          {
            title: suggested.length > 0 ? (allTitle ?? null) : null,
            items: match ? items.filter(match) : items,
          },
        ]}
        collections={collections}
        empty={empty}
        tagOf={filters.matchOnly ? (item) => tags[item.collectionSlug] : undefined}
      />
    </div>
  );
}

function MineGrid({ to, name }: GridProps & { name: string }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const lists = useUserLists().flatMap((list) =>
    list.listType === "want" ? [] : [{ slug: list.slug, name: list.name, type: list.listType }],
  );
  const [fromList, setList] = useListChoice(lists);
  const query = useInfiniteQuery(myCandidatesOptions(to, filters, fromList));

  return (
    <PickerGrid
      query={query}
      filters={filters}
      onFilters={setFilters}
      sourceActive={fromList !== undefined}
      source={
        lists.length > 0 ? (
          <ListSelect
            lists={lists}
            allLabel={m.offer_picker_list_all()}
            value={fromList}
            onChange={setList}
          />
        ) : null
      }
      matchLabel={m.offer_picker_only_they_want()}
      suggestedTitle={m.offer_picker_suggested()}
      allTitle={m.offer_picker_all_mine()}
      empty={
        narrowed(filters)
          ? narrowedEmpty(filters, setFilters, m.offer_picker_mine_none_wanted({ name }))
          : fromList
            ? { title: m.offer_picker_list_empty() }
            : { title: m.offer_picker_mine_empty() }
      }
    />
  );
}

/** Nothing listed is the reason whatever the filters, except under a picked list. */
function theirsEmpty(
  name: string,
  listed: boolean,
  filters: Filters,
  onFilters: (filters: Filters) => void,
  fromList: string | undefined,
) {
  if (!listed && !fromList) {
    return {
      title: m.offer_picker_theirs_none_listed({ name }),
      hint: m.offer_picker_theirs_none_listed_hint(),
    };
  }
  if (narrowed(filters)) {
    return narrowedEmpty(filters, onFilters, m.offer_picker_theirs_none_wanted({ name }));
  }
  if (fromList) return { title: m.offer_picker_theirs_list_empty() };
  return {
    title: m.offer_picker_theirs_none_held({ name }),
    hint: m.offer_picker_theirs_none_held_hint(),
  };
}

function TheirsGrid({
  to,
  name,
  lists,
  startList,
}: GridProps & { name: string; lists: PartnerList[]; startList?: string }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [fromList, setList] = useListChoice(lists, startList);
  const query = useInfiniteQuery(theirPickerOptions(to, filters, fromList));
  const listed = query.data?.pages[0]?.listed ?? true;

  return (
    <PickerGrid
      query={query}
      filters={filters}
      onFilters={setFilters}
      sourceActive={fromList !== undefined}
      source={
        lists.length > 0 ? (
          <ListSelect
            lists={lists}
            allLabel={m.offer_picker_list_all_theirs()}
            value={fromList}
            onChange={setList}
          />
        ) : null
      }
      matchLabel={m.offer_picker_only_i_want()}
      empty={theirsEmpty(name, listed, filters, setFilters, fromList)}
    />
  );
}

function TheirCollectionGrid({ to, name }: GridProps & { name: string }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const query = useInfiniteQuery(theirCollectionOptions(to, filters));

  return (
    <PickerGrid
      query={query}
      filters={filters}
      onFilters={setFilters}
      matchLabel={m.offer_picker_only_i_want()}
      suggestedTitle={m.offer_picker_any_copy_section()}
      empty={
        narrowed(filters)
          ? narrowedEmpty(filters, setFilters, m.offer_picker_theirs_none_wanted({ name }))
          : { title: m.offer_picker_theirs_collection_empty({ name }) }
      }
    />
  );
}
