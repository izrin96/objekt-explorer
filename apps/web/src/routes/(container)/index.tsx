import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import { MemberChips } from "@/features/filters/member-chips";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { useResetFilters } from "@/features/filters/use-filters";
import { AddToListProvider } from "@/features/list/add-to-list-dialog";
import { AddToListAction, AddToListMenuItem } from "@/features/list/add-to-list-menu-item";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { ObjektCardMenu } from "@/features/objekt/objekt-card-menu";
import { ObjektVirtualGrid } from "@/features/objekt/objekt-virtual-grid";
import { SelectBar } from "@/features/objekt/select-bar";
import { ShimmerGrid } from "@/features/objekt/shimmer-grid";
import { useCollectionObjekts } from "@/features/objekt/use-collection-objekts";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";
import { useClearSelectionOnNavigate, useSelection } from "@/stores/selection";

export const Route = createFileRoute("/(container)/")({
  validateSearch: filterSearchSchema,
  component: HomePage,
});

function HomePage() {
  const { data: user } = useCurrentUser();
  const { facets, groups } = useScopedFacets();
  const { filtered, filters, rarityMap, isPending } = useCollectionObjekts();
  const reset = useResetFilters();
  const ids = useSelection((s) => s.ids);
  const toggle = useSelection((s) => s.toggle);
  const [active, setActive] = useState<ValidObjekt | null>(null);

  useClearSelectionOnNavigate();

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;
      return (
        <ObjektCard
          objekt={objekt}
          selected={ids.has(objekt.id)}
          onToggleSelect={user ? (value) => toggle(value.id) : undefined}
          onOpen={setActive}
          qty={item.length > 1 ? item.length : undefined}
          priority={rowIndex < 2}
        >
          {user ? (
            <ObjektCardMenu>
              <AddToListMenuItem objekts={[objekt]} />
            </ObjektCardMenu>
          ) : null}
        </ObjektCard>
      );
    },
    [ids, toggle, user],
  );

  return (
    <AddToListProvider>
      <PageHeader title={m.home_title()} description={m.home_description()} />

      <MemberChips />
      <FilterBar facets={facets} groups={groups} />

      {!isPending && (
        <div className="text-muted-foreground font-mono text-xs">
          <b className="text-foreground font-semibold tabular-nums">
            {m.common_count_total_prefix()}
            {filtered.length.toLocaleString()}
          </b>
          {m.common_count_total_suffix()}
        </div>
      )}

      {isPending ? (
        <ShimmerGrid />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title={m.home_empty_title()}
          hint={m.home_empty_hint()}
          action={
            <Button variant="outline" size="sm" onClick={reset}>
              {m.filter_reset_filter()}
            </Button>
          }
        />
      ) : (
        <ObjektVirtualGrid
          objekts={filtered}
          filters={filters}
          rarityMap={rarityMap}
          renderItem={renderObjekt}
        />
      )}

      {user && (
        <SelectBar objekts={filtered}>
          <AddToListAction objekts={filtered} />
        </SelectBar>
      )}
      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </AddToListProvider>
  );
}
