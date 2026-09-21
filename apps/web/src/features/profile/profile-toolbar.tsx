import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { ReactNode } from "react";

import { ActiveChips, useActiveChips } from "@/features/filters/active-chips";
import {
  FACET_KEYS,
  FacetControls,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
} from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { ColumnsSelect, SortSelect } from "@/features/filters/filter-bar";
import { FilterPopover, LongTailFields, longTailCount } from "@/features/filters/filter-popover";
import { FilterSearch } from "@/features/filters/filter-search";
import { FilterSheet } from "@/features/filters/filter-sheet";
import {
  useCanonicalFilters,
  useResetFilters,
  useSetFilters,
} from "@/features/filters/use-filters";
import { m } from "@/paraglide/messages";

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
  /** trailing controls this surface alone carries — the checkpoint popover */
  extra?: ReactNode;
  showSearch?: boolean;
  /** Statistics measures a set rather than ordering one, so it shows neither */
  showSort?: boolean;
  showColumns?: boolean;
  /** only the owner of a live collection has locks to filter on */
  showLock?: boolean;
};

export function ProfileToolbar({
  extra,
  showSearch = true,
  showSort = true,
  showColumns = true,
  showLock = false,
}: ProfileToolbarProps) {
  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const reset = useResetFilters();
  const chips = useActiveChips();

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
        {showSearch && <FilterSearch />}

        <FacetControls
          surface="inline"
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          keys={FACET_KEYS}
          controlClassName="max-md:hidden"
        />

        <FilterPopover showLock={showLock} className="max-md:hidden" />

        <FilterSheet
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          extraCount={longTailCount(filters)}
          onReset={reset}
        >
          <div className="my-1 border-t" />
          <LongTailFields showLock={showLock} />
          {showColumns && (
            <>
              <div className="my-1 border-t" />
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">
                  {m.filter_column()}
                </span>
                <ColumnsSelect stacked />
              </div>
            </>
          )}
        </FilterSheet>

        {extra}

        {(showSort || showColumns) && (
          <div className="flex items-center gap-1.5 md:ml-auto">
            {showSort && <SortSelect sorts={PROFILE_SORTS} />}
            {showColumns && <ColumnsSelect className="max-md:hidden" />}
          </div>
        )}
      </div>

      <ActiveChips chips={chips} onRemove={(chip) => setFilters(chip.remove)} onReset={reset} />
    </>
  );
}
