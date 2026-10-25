import { PulseIcon } from "@phosphor-icons/react";
import type { ActivityType } from "@repo/api/schemas/activity";
import { activityTypeSchema } from "@repo/api/schemas/activity";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveChips, useActiveChips } from "@/features/filters/active-chips";
import {
  type ExtraFacet,
  ExtraFacetControls,
  FACET_KEYS,
  FacetControls,
  useDeclaredFacets,
  useFacetParity,
  type FacetKey,
} from "@/features/filters/facet-controls";
import { useScopedFacets } from "@/features/filters/facets";
import { QuickFilters } from "@/features/filters/filter-bar";
import { FilterSheet } from "@/features/filters/filter-sheet";
import { OnlineFilter } from "@/features/filters/online-filter";
import { ResetButton } from "@/features/filters/reset-button";
import { canReset } from "@/features/filters/search-schema";
import { SingleSelect } from "@/features/filters/single-select";
import { useCanonicalFilters, useSetFilters } from "@/features/filters/use-filters";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { m } from "@/paraglide/messages";

import { ActivityTable } from "./activity-table";
import { useActivityType, useResetActivity, useSetActivityType } from "./search-schema";
import { useLiveActivity } from "./use-live-activity";

const TYPE_LABEL: Record<ActivityType, () => string> = {
  all: m.filter_event_all,
  mint: m.filter_event_mint,
  transfer: m.filter_event_transfer,
  spin: m.filter_event_spin,
};

function EventFilter({ className }: { className?: string }) {
  const type = useActivityType();
  const setType = useSetActivityType();
  // built per render: the map callback runs at module load, where a message
  // resolves once in the base locale on the server
  const options = activityTypeSchema.options.map((value) => ({
    value,
    label: TYPE_LABEL[value](),
  }));
  return (
    <SingleSelect
      label={m.filter_event_label()}
      options={options}
      value={type}
      onChange={setType}
      defaultValue="all"
      className={className}
    />
  );
}

export function ActivityView() {
  const { facets, groups } = useScopedFacets();
  const filters = useCanonicalFilters();
  const setFilters = useSetFilters();
  const type = useActivityType();
  const setType = useSetActivityType();
  const reset = useResetActivity();
  const chips = useActiveChips();

  const [active, setActive] = useState<ValidObjekt | null>(null);
  const { query, rows, newIds, paused, onPointerEnter, onPointerLeave } = useLiveActivity(
    type,
    filters,
  );

  const setFacet = (key: FacetKey, value: string[]) =>
    setFilters({ [key]: value.length > 0 ? value : undefined });

  const values = {
    artist: filters.artist ?? [],
    member: filters.member ?? [],
    season: filters.season ?? [],
    class: filters.class ?? [],
    collection: filters.collection ?? [],
  };

  const extras = useMemo<ExtraFacet[]>(
    () => [
      { key: "type", active: type !== "all", quick: true, Control: EventFilter },
      { key: "on_offline", active: (filters.on_offline?.length ?? 0) > 0, Control: OnlineFilter },
    ],
    [type, filters.on_offline],
  );

  const declaredKeys = useMemo(() => [...FACET_KEYS, ...extras.map((e) => e.key)], [extras]);
  useDeclaredFacets("inline", declaredKeys);
  useFacetParity();

  const nothingToReset = !canReset(filters) && type === "all";

  const typeChip =
    type === "all"
      ? []
      : [{ key: "type", label: `${m.filter_event_label()}: ${TYPE_LABEL[type]()}`, remove: {} }];

  return (
    <>
      <PageHeader title={m.activity_title()} description={m.activity_description()} />

      <div className="flex flex-wrap items-center gap-2">
        <QuickFilters>
          <FilterSheet
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
            extras={extras}
            onReset={reset}
            resetDisabled={nothingToReset}
          />
          <ExtraFacetControls surface="inline" extras={extras} />
          <FacetControls
            surface="inline"
            facets={facets}
            groups={groups}
            values={values}
            onChange={setFacet}
          />
          <ResetButton onReset={reset} disabled={nothingToReset} />
        </QuickFilters>
      </div>

      <ActiveChips
        chips={[...typeChip, ...chips]}
        onRemove={(chip) => (chip.key === "type" ? setType("all") : setFilters(chip.remove))}
      />

      {query.isPending ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={PulseIcon}
          title={m.activity_empty()}
          hint={m.activity_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : (
        <>
          <ActivityTable
            rows={rows}
            newIds={newIds}
            onOpen={setActive}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
          />

          <InfiniteSentinel
            label={m.infinite_query_load_more_aria()}
            endLabel={m.activity_end()}
            hasNextPage={query.hasNextPage}
            isFetchingNextPage={query.isFetchingNextPage}
            fetchNextPage={() => void query.fetchNextPage()}
          />
        </>
      )}

      {paused && (
        <div
          aria-live="polite"
          className="bg-foreground text-background sticky bottom-4 z-5 mx-auto w-max rounded-full px-3 py-1 font-mono text-xs"
        >
          {m.activity_paused_on_hover()}
        </div>
      )}

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}
