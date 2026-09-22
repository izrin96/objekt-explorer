import { ColumnsIcon, SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react";
import type { ValidCustomSort, ValidSortDirection } from "@repo/cosmo/types/common";
import { useMemo } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPrimitive,
  SelectValue,
} from "@/components/ui/select";
import { cn, validColumns } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useColumns, useColumnStore } from "@/stores/columns";

import { ActiveChips, useActiveChips } from "./active-chips";
import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  NO_EXTRAS,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
} from "./facet-controls";
import type { Facets, MemberGroup } from "./facets";
import { FilterPopover, LongTailFields, longTailCount } from "./filter-popover";
import { FilterSearch } from "./filter-search";
import { FilterSheet } from "./filter-sheet";
import { DEFAULT_SORT_DIR } from "./search-schema";
import { useCanonicalFilters, useFilters, useResetFilters, useSetFilters } from "./use-filters";

const toolbarTrigger = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "gap-1.5 text-[13px]",
);

export const SORT_LABEL: Record<ValidCustomSort, () => string> = {
  date: m.filter_sort_by_date_label,
  season: m.filter_sort_by_season_label,
  collectionNo: m.filter_sort_by_collection_no_label,
  member: m.filter_sort_by_member_label,
  serial: m.filter_sort_by_serial_label,
  duplicate: m.filter_sort_by_dups_label,
  rare: m.filter_sort_by_rare_label,
  price: m.filter_sort_by_price_label,
  floor: m.filter_sort_by_floor_label,
  listedAt: m.filter_sort_by_listed_label,
  supply: m.filter_sort_by_supply_label,
};

/**
 * Picking a sort resets the direction to the one that sort is normally read
 * in, so the arrow is never a surprise; the arrow button then flips it.
 */
const SORT_DEFAULT_DIR: Record<ValidCustomSort, ValidSortDirection> = {
  date: "desc",
  season: "asc",
  collectionNo: "asc",
  member: "asc",
  serial: "asc",
  duplicate: "desc",
  rare: "desc",
  price: "asc",
  floor: "asc",
  listedAt: "desc",
  supply: "desc",
};

/** a collection row has no serial, no price and no listing, so neither has its sort */
export const HOME_SORTS: readonly ValidCustomSort[] = ["date", "season", "collectionNo", "member"];

export function ColumnsSelect({
  className,
  stacked = false,
}: {
  className?: string;
  stacked?: boolean;
}) {
  const columns = useColumns();
  const setColumns = useColumnStore((s) => s.setColumns);

  return (
    <Select value={columns} onValueChange={(value: number | null) => value && setColumns(value)}>
      <SelectPrimitive.Trigger
        aria-label={m.filter_column()}
        className={cn(toolbarTrigger, "font-mono", stacked && "w-full justify-between", className)}
      >
        <ColumnsIcon />
        <SelectValue />
      </SelectPrimitive.Trigger>
      <SelectPopup alignItemWithTrigger={false} align="end" className="min-w-20">
        {validColumns.map((count) => (
          <SelectItem key={count} value={count} className="font-mono">
            {count}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

export function SortSelect({
  sorts,
  className,
}: {
  sorts: readonly ValidCustomSort[];
  className?: string;
}) {
  const sort = useFilters((f) => f.sort);
  const sortDir = useFilters((f) => f.sort_dir);
  const setFilters = useSetFilters();

  const current = sort ?? sorts[0] ?? "date";
  const descending = (sortDir ?? SORT_DEFAULT_DIR[current]) === "desc";
  // a link can carry a sort this surface does not offer; keep it selectable
  // rather than silently rewriting someone's URL
  const options = sorts.includes(current) ? sorts : [current, ...sorts];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select
        value={current}
        onValueChange={(value: ValidCustomSort | null) =>
          value && setFilters({ sort: value, sort_dir: SORT_DEFAULT_DIR[value] })
        }
      >
        <SelectPrimitive.Trigger aria-label={m.filter_sort_by_label()} className={toolbarTrigger}>
          <SortAscendingIcon />
          <SelectValue>{(value: ValidCustomSort) => SORT_LABEL[value]()}</SelectValue>
        </SelectPrimitive.Trigger>
        <SelectPopup alignItemWithTrigger={false} align="end">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {SORT_LABEL[option]()}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={descending ? m.filter_asc() : m.filter_desc()}
        onClick={() =>
          setFilters({
            sort: current,
            sort_dir: descending ? "asc" : DEFAULT_SORT_DIR,
          })
        }
      >
        {descending ? <SortDescendingIcon /> : <SortAscendingIcon />}
      </Button>
    </div>
  );
}

type FilterBarProps = {
  facets: Facets;
  /** members grouped by artist; the Member dropdown groups when more than one is in scope */
  groups?: readonly MemberGroup[];
  sorts?: readonly ValidCustomSort[];
  showPricedOnly?: boolean;
  showLock?: boolean;
  /** toolbar controls this surface adds beside the five facets */
  extras?: readonly ExtraFacet[];
};

export function FilterBar({
  facets,
  groups,
  sorts = HOME_SORTS,
  showPricedOnly = false,
  showLock = false,
  extras = NO_EXTRAS,
}: FilterBarProps) {
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

  const inlineKeys = FACET_KEYS;
  const declaredKeys = useMemo(
    () => [...inlineKeys, ...extras.map((extra) => extra.key)],
    [inlineKeys, extras],
  );
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSearch />

        <FacetControls
          surface="inline"
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          keys={inlineKeys}
          controlClassName="max-md:hidden"
        />

        <ExtraFacetControls surface="inline" extras={extras} controlClassName="max-md:hidden" />

        <FilterPopover
          showPricedOnly={showPricedOnly}
          showLock={showLock}
          className="max-md:hidden"
        />

        <FilterSheet
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          extras={extras}
          extraCount={longTailCount(filters)}
          onReset={reset}
        >
          <div className="my-1 border-t" />
          <LongTailFields showPricedOnly={showPricedOnly} showLock={showLock} />
          <div className="my-1 border-t" />
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">{m.filter_column()}</span>
            <ColumnsSelect stacked />
          </div>
        </FilterSheet>

        <div className="flex items-center gap-1.5 md:ml-auto">
          <SortSelect sorts={sorts} />
          <ColumnsSelect className="max-md:hidden" />
        </div>
      </div>

      <ActiveChips chips={chips} onRemove={(chip) => setFilters(chip.remove)} onReset={reset} />
    </>
  );
}
