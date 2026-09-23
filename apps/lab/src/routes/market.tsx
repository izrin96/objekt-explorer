import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { createRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AddToListDialog } from "@/components/add-to-list-dialog";
import { useScopedFacets } from "@/components/filters/facets";
import { FilterBar } from "@/components/filters/filter-bar";
import { applyFilters, MARKET_SORTS, NO_IDS, useFilters } from "@/components/filters/filter-store";
import { ObjektCard } from "@/components/objekt-card";
import { ObjektDrawer } from "@/components/objekt-drawer";
import { ObjektGrid } from "@/components/objekt-grid";
import { SelectBar, selectBarFillClass } from "@/components/select-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TimeAgo } from "@/components/shared/time-ago";
import { Button } from "@/components/ui/button";
import { formatMyr, marketSummary } from "@/fixtures/market";
import { type LabObjekt, objekts } from "@/fixtures/objekts";
import { rootRoute } from "@/routes/root";
import { useSelection } from "@/store/selection";

/** the last marketplace sync, so the header line has a real moment behind it */
const SYNCED_AT = new Date(Date.now() - 4 * 60_000);

function Market() {
  const filters = useFilters();
  const { ids, toggle } = useSelection();
  const { facets, groups, scope } = useScopedFacets();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [active, setActive] = useState<LabObjekt | null>(null);

  useEffect(() => useSelection.getState().clear, []);

  const rows = useMemo(() => {
    const listed = applyFilters(objekts, filters, NO_IDS, NO_IDS, scope)
      .map(({ objekt }) => {
        // same generator the drawer's Market tab reads, so the two always agree
        const summary = marketSummary(objekt.slug);
        return { objekt, qty: summary.listings, floor: summary.floor };
      })
      // the marketplace only shows what is actually listed
      .filter((r) => r.qty > 0 && (!filters.pricedOnly || r.floor !== null));

    if (filters.sort === "floor") {
      const dir = filters.sortDesc ? -1 : 1;
      listed.sort((a, b) => {
        // unpriced listings sink to the bottom in both directions
        if (a.floor === null || b.floor === null)
          return Number(a.floor === null) - Number(b.floor === null);
        return (a.floor - b.floor) * dir;
      });
    }
    return listed;
  }, [filters, scope]);

  const visibleIds = rows.map((r) => r.objekt.id);
  const priced = rows.filter((r) => r.floor !== null).length;

  return (
    <>
      <PageHeader
        title="Marketplace"
        description={
          <>
            <span className="font-mono">9,684</span> collections ·{" "}
            <span className="font-mono">51,922</span> listings · prices in MYR
          </>
        }
        aside={
          <div className="text-muted-foreground font-mono text-[12.5px]">
            Synced{" "}
            <b className="text-foreground font-semibold">
              <TimeAgo date={SYNCED_AT} />
            </b>
          </div>
        }
      />

      <FilterBar facets={facets} groups={groups} sorts={MARKET_SORTS} showPricedOnly />

      <div className="text-muted-foreground font-mono text-[12.5px]">
        <b className="text-foreground font-semibold">{rows.length}</b> listings ·{" "}
        <b className="text-foreground font-semibold">{priced}</b> priced
      </div>

      {rows.length === 0 && (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title="No listings match"
          hint="Nothing is listed for sale under the current filters. Widen one, or clear them all."
          action={
            <Button variant="outline" size="sm" onClick={filters.reset}>
              Clear filters
            </Button>
          }
        />
      )}

      <ObjektGrid columns={filters.columns}>
        {rows.map(({ objekt, qty, floor }) => (
          <ObjektCard
            key={objekt.id}
            objekt={objekt}
            selected={ids.has(objekt.id)}
            onToggleSelect={(o) => toggle(o.id)}
            onOpen={setActive}
            qty={qty}
            price={floor === null ? undefined : formatMyr(floor)}
          />
        ))}
      </ObjektGrid>

      <SelectBar visibleIds={visibleIds}>
        <Button
          size="sm"
          onClick={() => setBulkOpen(true)}
          className={`${selectBarFillClass} shrink-0`}
        >
          <PlusIcon />
          Add to list
        </Button>
      </SelectBar>
      <AddToListDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        objektIds={[...ids]}
        onSubmitted={useSelection.getState().clear}
      />
      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}

export const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/market",
  component: Market,
});
