import type { ListType } from "@repo/api/schemas/list";
import type { CandidateItem, PartnerList } from "@repo/api/schemas/offer";
import type { PickerTag } from "@repo/api/schemas/trade";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type ReactNode, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PickerFilterBar } from "@/features/filters/picker-filter-bar";
import { NO_PICKER_FILTERS } from "@/features/filters/picker-filters";
import { SingleSelect } from "@/features/filters/single-select";
import { listOption } from "@/features/list/list-option";
import { useUserLists } from "@/features/user/hooks";
import { useLoadAllPages } from "@/hooks/use-load-all-pages";
import { m } from "@/paraglide/messages";
import { useSettings } from "@/stores/settings";

import { CandidateGrid } from "./candidate-grid";
import { candidateMatcher } from "./candidate-match";
import { pagedGridProps } from "./paged-grid-props";
import type { Collections } from "./pick";
import { emptyReason, type PickerView, viewActiveCount } from "./picker-view";
import {
  myCandidatesOptions,
  type OfferAddress,
  type PickerFilters,
  theirCollectionOptions,
  theirPickerOptions,
} from "./queries";

type GridProps = { to: OfferAddress };

type Filters = PickerFilters & { search: string };

// both switches start off, so a picker never opens on nothing
const NO_FILTERS: Filters = { ...NO_PICKER_FILTERS, matchOnly: false };

/** The remembered Sort and Hide not transferable, one value for all three pickers. */
function usePickerView(): PickerView {
  const sort = useSettings((s) => s.offerPickerSort);
  const hideUntransferable = useSettings((s) => s.offerPickerHideUntransferable);
  return { sort, hideUntransferable };
}

const turnOffHide = () => useSettings.getState().set({ offerPickerHideUntransferable: false });

/**
 * Nothing left, with at least one narrowing on: the match switch or the hide switch alone says
 * what it kept out, with the way to turn it off; anything else gets the plain wording.
 * Null when nothing narrows, so the side's own empty line applies.
 */
function narrowedEmpty(
  filters: Filters,
  view: PickerView,
  onFilters: (filters: Filters) => void,
  matchTitle: string,
  matchLocked = false,
) {
  const { reason, turnOff } = emptyReason(filters, view, matchLocked);
  if (reason === "plain") return null;
  if (reason === "filtered") return { title: m.offer_picker_filtered() };
  const title = reason === "hide" ? m.offer_picker_none_transferable() : matchTitle;
  return {
    title,
    action: turnOff ? (
      <Button
        variant="outline"
        size="sm"
        onClick={
          reason === "hide" ? turnOffHide : () => onFilters({ ...filters, matchOnly: false })
        }
      >
        {m.offer_picker_match_off()}
      </Button>
    ) : undefined,
  };
}

/** A labelled switch in the picker's filter bar. */
function PickerSwitch({
  checked,
  onChange,
  label,
  locked = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** on, and it stays on (the partner only takes what they want) */
  locked?: boolean;
}) {
  const id = useId();
  return (
    <span className="flex items-center gap-2">
      <Switch id={id} checked={checked} disabled={locked} onCheckedChange={onChange} />
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

function PickerListSelect({
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
  matchLocked = false,
  defaultSortLabel,
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
  matchLocked?: boolean;
  /** what the picker's own order is called */
  defaultSortLabel: string;
  suggestedTitle?: string;
  allTitle?: string;
  empty: { title: string; hint?: string };
}) {
  const sort = useSettings((s) => s.offerPickerSort);
  const hideUntransferable = useSettings((s) => s.offerPickerHideUntransferable);
  const set = useSettings((s) => s.set);
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
        extraActive={
          (filters.matchOnly ? 1 : 0) +
          (sourceActive ? 1 : 0) +
          viewActiveCount({ sort, hideUntransferable })
        }
      >
        <PickerSwitch
          checked={filters.matchOnly}
          onChange={(matchOnly) => onFilters({ ...filters, matchOnly })}
          label={matchLabel}
          locked={matchLocked}
        />
        <SingleSelect
          label={m.filter_sort_by_label()}
          options={[
            { value: "default", label: defaultSortLabel },
            { value: "collectionNo", label: m.filter_sort_by_collection_no_label() },
          ]}
          value={sort}
          defaultValue="default"
          showValue
          onChange={(offerPickerSort) => set({ offerPickerSort })}
        />
        <PickerSwitch
          checked={hideUntransferable}
          onChange={(offerPickerHideUntransferable) => set({ offerPickerHideUntransferable })}
          label={m.offer_picker_hide_untransferable()}
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

export function MineGrid({
  to,
  name,
  wantedOnly = false,
  wantList,
}: GridProps & {
  name: string;
  wantedOnly?: boolean;
  /** with `wantedOnly`: the post's own want list, the only one the gives may come from */
  wantList?: string;
}) {
  const [chosen, setFilters] = useState(NO_FILTERS);
  // derived, not seeded: the partner's rules may land after the picker opens
  const filters = wantedOnly ? { ...chosen, matchOnly: true } : chosen;
  const view = usePickerView();
  const lists = useUserLists().flatMap((list) =>
    list.listType === "want" ? [] : [{ slug: list.slug, name: list.name, type: list.listType }],
  );
  const [fromList, setList] = useListChoice(lists);
  const query = useInfiniteQuery(
    myCandidatesOptions(to, filters, view, fromList, wantedOnly ? wantList : undefined),
  );

  return (
    <PickerGrid
      query={query}
      filters={filters}
      onFilters={setFilters}
      sourceActive={fromList !== undefined}
      source={
        lists.length > 0 ? (
          <PickerListSelect
            lists={lists}
            allLabel={m.offer_picker_list_all()}
            value={fromList}
            onChange={setList}
          />
        ) : null
      }
      matchLabel={m.offer_picker_only_they_want()}
      matchLocked={wantedOnly}
      defaultSortLabel={m.offer_picker_sort_newest()}
      suggestedTitle={m.offer_picker_suggested()}
      allTitle={m.offer_picker_all_mine()}
      empty={
        narrowedEmpty(
          filters,
          view,
          setFilters,
          m.offer_picker_mine_none_wanted({ name }),
          wantedOnly,
        ) ??
        (fromList ? { title: m.offer_picker_list_empty() } : { title: m.offer_picker_mine_empty() })
      }
    />
  );
}

/** Nothing listed is the reason whatever the filters, except under a picked list. */
function theirsEmpty(
  name: string,
  listed: boolean,
  filters: Filters,
  view: PickerView,
  onFilters: (filters: Filters) => void,
  fromList: string | undefined,
) {
  if (!listed) {
    return {
      title: m.offer_picker_theirs_none_listed({ name }),
      hint: m.offer_picker_theirs_none_listed_hint(),
    };
  }
  const narrowedTitle = narrowedEmpty(
    filters,
    view,
    onFilters,
    m.offer_picker_theirs_none_wanted({ name }),
  );
  if (narrowedTitle) return narrowedTitle;
  if (fromList) return { title: m.offer_picker_theirs_list_empty() };
  return {
    title: m.offer_picker_theirs_none_held({ name }),
    hint: m.offer_picker_theirs_none_held_hint(),
  };
}

export function TheirsGrid({
  to,
  name,
  lists,
  startList,
  post,
}: GridProps & {
  name: string;
  lists: PartnerList[];
  startList?: string;
  /** the post the offer is on: the picker shows only it, with no List choice */
  post?: string;
}) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [picked, setList] = useListChoice(lists, startList);
  const fromList = post ?? picked;
  const view = usePickerView();
  const query = useInfiniteQuery(theirPickerOptions(to, filters, view, fromList));
  const listed = query.data?.pages[0]?.listed ?? true;

  return (
    <PickerGrid
      query={query}
      filters={filters}
      onFilters={setFilters}
      sourceActive={fromList !== undefined}
      source={
        lists.length > 0 && post === undefined ? (
          <PickerListSelect
            lists={lists}
            allLabel={m.offer_picker_list_all_theirs()}
            value={fromList}
            onChange={setList}
          />
        ) : null
      }
      matchLabel={m.offer_picker_only_i_want()}
      defaultSortLabel={m.offer_picker_sort_list()}
      empty={theirsEmpty(name, listed, filters, view, setFilters, fromList)}
    />
  );
}

export function TheirCollectionGrid({ to, name }: GridProps & { name: string }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const view = usePickerView();
  const query = useInfiniteQuery(theirCollectionOptions(to, filters, view));
  // closed while open: the server returns an empty page, and no filter or switch explains it
  const listed = query.data?.pages[0]?.listed ?? true;
  const fallback = { title: m.offer_picker_theirs_collection_empty({ name }) };

  return (
    <PickerGrid
      query={query}
      filters={filters}
      onFilters={setFilters}
      matchLabel={m.offer_picker_only_i_want()}
      defaultSortLabel={m.offer_picker_sort_newest()}
      suggestedTitle={m.offer_picker_any_copy_section()}
      empty={
        listed
          ? (narrowedEmpty(
              filters,
              view,
              setFilters,
              m.offer_picker_theirs_none_wanted({ name }),
            ) ?? fallback)
          : fallback
      }
    />
  );
}
