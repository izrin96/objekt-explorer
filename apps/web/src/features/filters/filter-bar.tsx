import { ColumnsIcon, SortAscendingIcon, SortDescendingIcon, XIcon } from "@phosphor-icons/react";
import type { ValidCustomSort, ValidGroupBy, ValidSortDirection } from "@repo/cosmo/types/common";
import { validGroupBy } from "@repo/cosmo/types/common";
import { type ReactNode, useMemo } from "react";

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
import {
  FilterPopover,
  LONG_TAIL,
  LongTailFields,
  longTailCount,
  type LongTailField,
} from "./filter-popover";
import { FilterSearchField } from "./filter-search";
import { FilterSheet } from "./filter-sheet";
import { GROUP_BY_LABEL, SORT_DESC, SORT_LABEL } from "./labels";
import { DEFAULT_SORT_DIR, isFiltering } from "./search-schema";
import { useCanonicalFilters, useFilters, useResetFilters, useSetFilters } from "./use-filters";

const toolbarTrigger = cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5");

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
  rare: "asc",
  price: "asc",
  floor: "asc",
  listedAt: "desc",
  supply: "desc",
};

/** a collection row has no serial, no price and no listing, so neither has its sort */
const HOME_SORTS: readonly ValidCustomSort[] = ["date", "season", "collectionNo", "member", "rare"];

/** the absence of `group_by`, spelled as a value so the select has a "None" item */
const NO_GROUP = "none";

function ColumnsSelect({ className, stacked = false }: { className?: string; stacked?: boolean }) {
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

function SortSelect({
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
          value &&
          setFilters({
            sort: value,
            sort_dir: SORT_DEFAULT_DIR[value],
            // a duplicate count only exists once copies share a card, and a
            // serial only belongs to a card standing for one copy
            ...(value === "duplicate"
              ? { grouped: true }
              : value === "serial"
                ? { grouped: undefined }
                : {}),
          })
        }
      >
        <SelectPrimitive.Trigger aria-label={m.filter_sort_by_label()} className={toolbarTrigger}>
          {descending ? <SortAscendingIcon /> : <SortDescendingIcon />}
          <SelectValue>{(value: ValidCustomSort) => SORT_LABEL[value]()}</SelectValue>
        </SelectPrimitive.Trigger>
        <SelectPopup alignItemWithTrigger={false} align="end">
          {options.map((option) => (
            <SelectItem key={option} value={option} className="py-1.5">
              <span className="flex flex-col">
                {SORT_LABEL[option]()}
                <span className="text-muted-foreground text-xs">{SORT_DESC[option]()}</span>
              </span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={descending ? m.filter_desc() : m.filter_asc()}
        onClick={() =>
          setFilters({
            sort: current,
            sort_dir: descending ? "asc" : DEFAULT_SORT_DIR,
          })
        }
      >
        {descending ? <SortAscendingIcon /> : <SortDescendingIcon />}
      </Button>
    </div>
  );
}

/**
 * Grouping splits the grid into labelled sections; the direction button is only
 * meaningful once there are sections, so it joins the row with the grouping.
 */
function GroupBySelect({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  const groupBy = useFilters((f) => f.group_by);
  const groupDir = useFilters((f) => f.group_dir);
  const setFilters = useSetFilters();

  const ascending = groupDir === "asc";

  return (
    <div className={cn("flex items-center gap-1.5", stacked && "w-full", className)}>
      <Select
        value={groupBy ?? NO_GROUP}
        onValueChange={(value: string | null) =>
          setFilters({
            group_by: value === null || value === NO_GROUP ? undefined : (value as ValidGroupBy),
            // member and class read best low-to-high; every other grouping is
            // already in the order its labels sort
            group_dir: value === "member" || value === "class" ? "asc" : undefined,
          })
        }
      >
        <SelectPrimitive.Trigger
          aria-label={m.filter_group_by_label()}
          data-active={groupBy !== undefined || undefined}
          className={cn(
            toolbarTrigger,
            "data-active:border-foreground",
            stacked && "w-full justify-between",
          )}
        >
          <span>
            {m.filter_group_by_label()}
            {groupBy !== undefined && (
              <span className="text-muted-foreground"> · {GROUP_BY_LABEL[groupBy]()}</span>
            )}
          </span>
        </SelectPrimitive.Trigger>
        <SelectPopup alignItemWithTrigger={false} align="end" className="min-w-44">
          <SelectItem value={NO_GROUP}>{m.common_form_none()}</SelectItem>
          {validGroupBy.map((option) => (
            <SelectItem key={option} value={option}>
              {GROUP_BY_LABEL[option]()}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      {groupBy !== undefined && (
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={ascending ? m.filter_asc() : m.filter_desc()}
          onClick={() => setFilters({ group_dir: ascending ? undefined : "asc" })}
        >
          {ascending ? <SortDescendingIcon /> : <SortAscendingIcon />}
        </Button>
      )}
    </div>
  );
}

/** Always on the toolbar and only ever disabled, so its place never moves. */
export function ResetButton({
  onReset,
  disabled,
  className,
}: {
  onReset: () => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      disabled={disabled}
      onClick={onReset}
    >
      <XIcon />
      {m.filter_reset_filter()}
    </Button>
  );
}

/** The sheet block for the toolbar controls the inline row hides below `md`. */
function StackedToolbarFields({
  showGroupBy = false,
  showColumns = false,
}: {
  showGroupBy?: boolean;
  showColumns?: boolean;
}) {
  return (
    <>
      {showGroupBy && (
        <>
          <div className="my-1 border-t" />
          <GroupBySelect stacked />
        </>
      )}
      {showColumns && (
        <>
          <div className="my-1 border-t" />
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">{m.filter_column()}</span>
            <ColumnsSelect stacked />
          </div>
        </>
      )}
    </>
  );
}

type FilterBarProps = {
  facets: Facets;
  /** members grouped by artist; the Member dropdown groups when more than one is in scope */
  groups?: readonly MemberGroup[];
  sorts?: readonly ValidCustomSort[];
  /** the surface's column of the long-tail matrix, from `LONG_TAIL` */
  longTail?: readonly LongTailField[];
  /** toolbar controls this surface adds beside the five facets */
  extras?: readonly ExtraFacet[];
  /** the extras lead the facets, as the sheet always has them */
  extrasFirst?: boolean;
  /** trailing controls this surface alone carries, e.g. the checkpoint popover */
  extra?: ReactNode;
  showSearch?: boolean;
  /** sort and group-by together: a surface that orders nothing has neither */
  showSort?: boolean;
  showColumns?: boolean;
};

export function FilterBar({
  facets,
  groups,
  sorts = HOME_SORTS,
  longTail = LONG_TAIL.home,
  extras = NO_EXTRAS,
  extrasFirst = false,
  extra,
  showSearch = true,
  showSort = true,
  showColumns = true,
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

  const declaredKeys = useMemo(() => [...FACET_KEYS, ...extras.map((item) => item.key)], [extras]);
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showSearch && <FilterSearchField />}

        <QuickFilters>
          <FilterSheet
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
            extras={extras}
            extraCount={longTailCount(filters, longTail)}
            onReset={reset}
          >
            <div className="my-1 border-t" />
            <LongTailFields fields={longTail} surface="stacked" />
            <StackedToolbarFields showGroupBy={showSort} showColumns={showColumns} />
          </FilterSheet>

          {extrasFirst && <ExtraFacetControls surface="inline" extras={extras} />}

          <FacetControls
            surface="inline"
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
          />

          {!extrasFirst && <ExtraFacetControls surface="inline" extras={extras} />}

          <FilterPopover fields={longTail} className="max-md:hidden" />

          {extra}
        </QuickFilters>

        <div className="flex items-center gap-1.5 md:ml-auto">
          {showSort && (
            <>
              <SortSelect sorts={sorts} />
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

/**
 * Below `md` the Filters trigger and the quick controls get lines of their own,
 * wrapping rather than scrolling so none of them sits out of sight; from `md`
 * the wrapper dissolves and the controls rejoin the toolbar row.
 */
export function QuickFilters({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 max-md:w-full md:contents">{children}</div>
  );
}
