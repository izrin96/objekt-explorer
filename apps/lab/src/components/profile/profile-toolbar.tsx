import {
  CaretDownIcon,
  ClockCounterClockwiseIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { type ReactNode, useMemo, useState } from "react";

import { ActiveChips } from "@/components/filters/active-chips";
import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  NO_EXTRAS,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
} from "@/components/filters/facet-controls";
import { useScopedFacets } from "@/components/filters/facets";
import { ColumnsSelect, SortSelect } from "@/components/filters/filter-bar";
import { FilterPopover, LongTailFields } from "@/components/filters/filter-popover";
import { FilterSearch } from "@/components/filters/filter-search";
import { FilterSheet } from "@/components/filters/filter-sheet";
import {
  activeChips,
  longTailCount,
  PROFILE_SORTS,
  useFilters,
  useSurfaceFilters,
  type Sort,
} from "@/components/filters/filter-store";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import type { LabObjekt } from "@/fixtures/objekts";
import { useSnapshot, useSnapshotDate } from "@/store/snapshot";

/**
 * Compact filter bar shape from the mockup, rendering the shared facet table.
 *
 * Same store and same controls as `FilterBar`: the Filters popover on `md+`,
 * the Filters sheet below it, and one sort / columns pair — so what the toolbar
 * shows is what `applyFilters` does to the grid.
 */
export function ProfileToolbar({
  sorts = PROFILE_SORTS,
  sortLabel = "Received",
  extra,
  extras = NO_EXTRAS,
  source,
  showSearch = true,
  showSort = true,
  showColumns = true,
  showLock = false,
}: {
  /** `null` keeps the static button: the Progress tab has no store-backed sort */
  sorts?: readonly Sort[] | null;
  sortLabel?: string;
  /** trailing controls that belong to this surface alone (the snapshot popover) */
  extra?: ReactNode;
  /**
   * Filter controls outside the five facets — the Activity tab's Event select.
   * Unlike `extra` these go through the facet-parity system, so they render in
   * the mobile sheet too.
   */
  extras?: readonly ExtraFacet[];
  /**
   * What the facet dropdowns offer. The Collection tab narrows them to the
   * objekts actually on the grid — which is the snapshot-filtered set when a
   * snapshot is on — while Progress and Statistics measure the catalogue and
   * need every option in it, so they leave this alone.
   */
  source?: readonly LabObjekt[];
  showSearch?: boolean;
  /** Statistics measures a set rather than ordering one, so it shows neither */
  showSort?: boolean;
  showColumns?: boolean;
  /** the Lock filter, which only the Collection tab has a lock set behind */
  showLock?: boolean;
}) {
  const { facets, groups } = useScopedFacets(source);
  const f = useFilters();
  const chips = activeChips(f);

  useSurfaceFilters({ locked: showLock });

  const values = {
    artist: f.artist,
    member: f.member,
    season: f.season,
    class: f.class,
    collectionNo: f.collectionNo,
  };
  const setFacet = (key: FacetKey, value: string[]) => f.set({ [key]: value });

  const inlineKeys = FACET_KEYS;
  const declaredKeys = useMemo(
    () => [...inlineKeys, ...extras.map((e) => e.key)],
    [inlineKeys, extras],
  );
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showSearch && <FilterSearch />}
        <ExtraFacetControls surface="inline" extras={extras} controlClassName="max-md:hidden" />
        <FacetControls
          surface="inline"
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          keys={inlineKeys}
          controlClassName="max-md:hidden"
        />
        <FilterPopover showLock={showLock} className="max-md:hidden" />
        <FilterSheet
          facets={facets}
          groups={groups}
          values={values}
          onChange={setFacet}
          extras={extras}
          extraCount={longTailCount(f)}
          onReset={f.reset}
        >
          <div className="my-1 border-t" />
          <LongTailFields showLock={showLock} />
          {showColumns && (
            <>
              <div className="my-1 border-t" />
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium">Columns</span>
                <ColumnsSelect stacked />
              </div>
            </>
          )}
        </FilterSheet>
        {extra}
        {(showSort || showColumns) && (
          <div className="flex items-center gap-1.5 md:ml-auto">
            {showSort &&
              (sorts === null ? (
                <Button variant="outline" size="sm">
                  <SparkleIcon />
                  {sortLabel}
                  <CaretDownIcon className="size-3 opacity-60" />
                </Button>
              ) : (
                <SortSelect sorts={sorts} />
              ))}
            {showColumns && <ColumnsSelect className="max-md:hidden" />}
          </div>
        )}
      </div>

      <ActiveChips chips={chips} onRemove={(c) => f.set(c.remove)} onReset={f.reset} />
    </>
  );
}

/**
 * Snapshot = "view collection as of date". Base UI ships no DateField, so:
 * cnippet Calendar (react-day-picker) for picking + native `<input type="date">`
 * for typing. Both bound to the same value.
 *
 * The picked date is a draft until Apply: the four tabs re-derive their whole
 * owned set from it, so committing on every calendar click would reshuffle the
 * grid behind the open popover on the way to the date the user actually wants.
 * Reset is the website's own affordance and sits outside the popover, because
 * a snapshot you have to open a popover to leave is a mode with no exit in
 * sight — the trigger already carries the date, so the way out belongs beside
 * it.
 */
export function SnapshotPopover({ nickname }: { nickname: string }) {
  // the date lives in `store/snapshot.ts` rather than here: the Collection tab
  // has to know whether a snapshot is on before it lets the owner reorder
  // their pins, and all four tabs that render this control share one answer
  const date = useSnapshotDate(nickname) ?? undefined;
  const [draft, setDraft] = useState<Date | undefined>(date);
  const [open, setOpen] = useState(false);

  const commit = (value: Date | undefined) =>
    useSnapshot.getState().setDate(nickname, value ?? null);

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          // a popover that reopens on last session's draft would show a date
          // the page is not actually filtered by
          if (next) setDraft(date);
          setOpen(next);
        }}
      >
        <PopoverTrigger render={<Button variant={date ? "secondary" : "outline"} size="sm" />}>
          <ClockCounterClockwiseIcon />
          {date ? format(date, "d MMM yyyy") : "Snapshot"}
          <CaretDownIcon className="size-3 opacity-60" />
        </PopoverTrigger>
        <PopoverPopup align="start" className="w-auto">
          <PopoverTitle className="mb-2 text-sm font-medium">Collection as of</PopoverTitle>
          <input
            type="date"
            aria-label="Snapshot date"
            value={draft ? format(draft, "yyyy-MM-dd") : ""}
            max={format(new Date(), "yyyy-MM-dd")}
            onChange={(e) => setDraft(e.target.valueAsDate ?? undefined)}
            className="bg-background focus-visible:ring-ring mb-2 h-8 w-full rounded-lg border px-2.5 font-mono text-sm outline-none focus-visible:ring-2"
          />
          <Calendar
            mode="single"
            selected={draft}
            onSelect={setDraft}
            disabled={{ after: new Date() }}
            className="p-0"
          />
          <div className="mt-2 flex justify-end gap-1.5">
            <Button variant="ghost" size="xs" disabled={!draft} onClick={() => setDraft(undefined)}>
              Clear
            </Button>
            <Button
              size="xs"
              disabled={!draft}
              onClick={() => {
                commit(draft);
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverPopup>
      </Popover>

      {date && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft(undefined);
            commit(undefined);
          }}
        >
          <XIcon />
          Reset
        </Button>
      )}
    </>
  );
}
