import { ColumnsIcon, SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react";
import { useEffect } from "react";

import { ActiveChips } from "@/components/filters/active-chips";
import {
  FACET_KEYS,
  FacetControls,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
} from "@/components/filters/facet-controls";
import type { Facets, MemberGroup } from "@/components/filters/facets";
import { FilterPopover, LongTailFields } from "@/components/filters/filter-popover";
import { FilterSearch } from "@/components/filters/filter-search";
import { FilterSheet } from "@/components/filters/filter-sheet";
import {
  activeChips,
  COLUMNS,
  HOME_SORTS,
  longTailCount,
  SORT_DEFAULT_DESC,
  SORT_LABEL,
  useFilters,
  useSurfaceFilters,
  type Columns,
  type Sort,
} from "@/components/filters/filter-store";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPrimitive,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const toolbarTrigger = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "gap-1.5 text-[13px]",
);

type FilterBarProps = {
  facets: Facets;
  /** members grouped by artist; the Member dropdown groups when more than one is in scope */
  groups?: readonly MemberGroup[];
  /** sort options this surface offers (defaults to the Home set) */
  sorts?: readonly Sort[];
  /** Market only: adds the "Priced only" switch to the Filters popover */
  showPricedOnly?: boolean;
};

/** the columns control, which has no room in the toolbar below `md` */
export function ColumnsSelect({
  className,
  stacked = false,
}: {
  className?: string;
  stacked?: boolean;
}) {
  const f = useFilters();

  return (
    <Select value={f.columns} onValueChange={(v: Columns | null) => v && f.set({ columns: v })}>
      <SelectPrimitive.Trigger
        aria-label="Columns"
        className={cn(toolbarTrigger, "font-mono", stacked && "w-full justify-between", className)}
      >
        <ColumnsIcon />
        <SelectValue />
      </SelectPrimitive.Trigger>
      <SelectPopup alignItemWithTrigger={false} align="end" className="min-w-20">
        {COLUMNS.map((c) => (
          <SelectItem key={c} value={c} className="font-mono">
            {c}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

/**
 * Sort key + direction, shared by every surface's toolbar. Picking a key resets
 * the direction to the one that key is normally read in, so the arrow is never
 * a surprise; the arrow button then flips it.
 */
export function SortSelect({ sorts, className }: { sorts: readonly Sort[]; className?: string }) {
  const f = useFilters();

  // one store drives every surface, so pull the sort back into range on arrival
  useEffect(() => {
    if (!sorts.includes(f.sort)) {
      const next = sorts[0] ?? "newest";
      f.set({ sort: next, sortDesc: SORT_DEFAULT_DESC[next] });
    }
  }, [sorts, f]);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select
        value={f.sort}
        onValueChange={(v: Sort | null) => v && f.set({ sort: v, sortDesc: SORT_DEFAULT_DESC[v] })}
      >
        <SelectPrimitive.Trigger aria-label="Sort" className={toolbarTrigger}>
          <SortAscendingIcon />
          <SelectValue>{(v: Sort) => SORT_LABEL[v]}</SelectValue>
        </SelectPrimitive.Trigger>
        <SelectPopup alignItemWithTrigger={false} align="end">
          {sorts.map((s) => (
            <SelectItem key={s} value={s}>
              {SORT_LABEL[s]}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={f.sortDesc ? "Sort ascending" : "Sort descending"}
        onClick={() => f.set({ sortDesc: !f.sortDesc })}
      >
        {f.sortDesc ? <SortDescendingIcon /> : <SortAscendingIcon />}
      </Button>
    </div>
  );
}

/** Port of `.filterbar` + `.chips` from design/objekt-redesign-mockup.html */
export function FilterBar({
  facets,
  groups,
  sorts = HOME_SORTS,
  showPricedOnly = false,
}: FilterBarProps) {
  const f = useFilters();
  const chips = activeChips(f);

  // one store drives every surface, so drop Market's own switch — and the
  // profile Collection tab's Lock — on the way out
  useSurfaceFilters({ pricedOnly: showPricedOnly });

  const values = {
    artist: f.artist,
    member: f.member,
    season: f.season,
    class: f.class,
    collectionNo: f.collectionNo,
  };
  const setFacet = (key: FacetKey, value: string[]) => f.set({ [key]: value });

  const inlineKeys = FACET_KEYS;
  useDeclaredFacets("inline", inlineKeys);
  useFacetParity();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <FilterSearch />

        {/* md+: the facet row inline. Below md the same facets are in the sheet. */}
        <FacetControls
          surface="inline"
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          keys={inlineKeys}
          controlClassName="max-md:hidden"
        />

        <FilterPopover showPricedOnly={showPricedOnly} className="max-md:hidden" />

        <FilterSheet
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          extraCount={longTailCount(f)}
          onReset={f.reset}
        >
          <div className="my-1 border-t" />
          <LongTailFields showPricedOnly={showPricedOnly} />
          <div className="my-1 border-t" />
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">Columns</span>
            <ColumnsSelect stacked />
          </div>
        </FilterSheet>

        <div className="flex items-center gap-1.5 md:ml-auto">
          <SortSelect sorts={sorts} />
          <ColumnsSelect className="max-md:hidden" />
        </div>
      </div>

      <ActiveChips chips={chips} onRemove={(c) => f.set(c.remove)} onReset={f.reset} />
    </>
  );
}
