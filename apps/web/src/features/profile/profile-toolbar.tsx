import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { ActiveChips, useActiveChips } from "@/features/filters/active-chips";
import {
  FACET_KEYS,
  FacetControls,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
} from "@/features/filters/facet-controls";
import { ETC_CLASSES, useScopedFacets } from "@/features/filters/facets";
import {
  ColumnsSelect,
  GroupBySelect,
  ResetButton,
  SortSelect,
  StackedToolbarFields,
} from "@/features/filters/filter-bar";
import {
  FilterPopover,
  LongTailFields,
  longTailCount,
  type LongTailField,
} from "@/features/filters/filter-popover";
import { FilterSearchField } from "@/features/filters/filter-search";
import { FilterSheet } from "@/features/filters/filter-sheet";
import { isFiltering } from "@/features/filters/search-schema";
import {
  useCanonicalFilters,
  useResetFilters,
  useSetFilters,
} from "@/features/filters/use-filters";

/** an owned row carries a serial and a received date, so the profile sorts by them */
const PROFILE_SORTS: readonly ValidCustomSort[] = [
  "date",
  "season",
  "collectionNo",
  "member",
  "serial",
  "duplicate",
  "rare",
];

type ProfileToolbarProps = {
  /** the tab's column of the long-tail matrix, from `LONG_TAIL` */
  longTail: readonly LongTailField[];
  /** trailing controls this surface alone carries — the checkpoint popover */
  extra?: ReactNode;
  showSearch?: boolean;
  /** Statistics measures a set rather than ordering one, so it shows neither */
  showSort?: boolean;
  showColumns?: boolean;
  /** Progress measures completion, which Welcome and Zero are not part of */
  hideEtcClasses?: boolean;
};

export function ProfileToolbar({
  longTail,
  extra,
  showSearch = true,
  showSort = true,
  showColumns = true,
  hideEtcClasses = false,
}: ProfileToolbarProps) {
  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const reset = useResetFilters();
  const chips = useActiveChips();

  const scoped = useMemo(
    () =>
      hideEtcClasses
        ? { ...facets, classes: facets.classes.filter((name) => !ETC_CLASSES.includes(name)) }
        : facets,
    [facets, hideEtcClasses],
  );

  const values = {
    artist: filters.artist ?? [],
    member: filters.member ?? [],
    season: filters.season ?? [],
    class: filters.class ?? [],
    collection: filters.collection ?? [],
  };
  const setFacet = (key: FacetKey, value: string[]) =>
    setFilters({ [key]: value.length > 0 ? value : undefined });

  useDeclaredFacets("inline", FACET_KEYS);
  useFacetParity();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showSearch && <FilterSearchField />}

        <FacetControls
          surface="inline"
          facets={scoped}
          groups={groups}
          values={values}
          onChange={setFacet}
          keys={FACET_KEYS}
          controlClassName="max-md:hidden"
        />

        <FilterPopover fields={longTail} className="max-md:hidden" />

        <FilterSheet
          facets={scoped}
          groups={groups}
          values={values}
          onChange={setFacet}
          extraCount={longTailCount(filters, longTail)}
          onReset={reset}
        >
          <div className="my-1 border-t" />
          <LongTailFields fields={longTail} />
          <StackedToolbarFields showGroupBy={showSort} showColumns={showColumns} />
        </FilterSheet>

        {extra}

        <div className="flex items-center gap-1.5 md:ml-auto">
          {showSort && (
            <>
              <SortSelect sorts={PROFILE_SORTS} />
              <GroupBySelect className="max-md:hidden" />
            </>
          )}
          {showColumns && <ColumnsSelect className="max-md:hidden" />}
          <ResetButton onReset={reset} disabled={!isFiltering(filters)} className="max-md:hidden" />
        </div>
      </div>

      <ActiveChips chips={chips} onRemove={(chip) => setFilters(chip.remove)} onReset={reset} />
    </>
  );
}
