import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { createRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AddToListDialog } from "@/components/add-to-list-dialog";
import { useScopedFacets } from "@/components/filters/facets";
import { FilterBar } from "@/components/filters/filter-bar";
import { applyFilters, NO_IDS, useFilters } from "@/components/filters/filter-store";
import { MemberChips } from "@/components/filters/member-chips";
import { ObjektCard } from "@/components/objekt-card";
import { ObjektCardMenu } from "@/components/objekt-card-menu";
import { ObjektDrawer } from "@/components/objekt-drawer";
import { ObjektGrid } from "@/components/objekt-grid";
import { SelectBar, selectBarFillClass } from "@/components/select-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { TimeAgo } from "@/components/shared/time-ago";
import { Button } from "@/components/ui/button";
import { type LabObjekt, objekts } from "@/fixtures/objekts";
import { rootRoute } from "@/routes/root";
import { useSelection } from "@/store/selection";

/** fake pins: first two fixtures */
const PINNED: ReadonlySet<string> = new Set(objekts.slice(0, 2).map((o) => o.id));

/** the last indexer sweep, so the header line has a real moment behind it */
const UPDATED_AT = new Date(Date.now() - 2 * 60_000);

function Home() {
  const filters = useFilters();
  const { ids, toggle } = useSelection();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [active, setActive] = useState<LabObjekt | null>(null);

  // the selection store is shared with Profile and Market; start each page clean
  useEffect(() => useSelection.getState().clear, []);

  const { facets, groups, scope } = useScopedFacets();
  const rows = useMemo(
    () => applyFilters(objekts, filters, PINNED, NO_IDS, scope),
    [filters, scope],
  );
  const visibleIds = rows.map((r) => r.objekt.id);

  return (
    <>
      <PageHeader
        title="Objekts"
        description={
          <>
            <span className="font-mono tabular-nums">15,548</span> collections across tripleS, ARTMS
            and idntt
          </>
        }
        aside={
          <div className="text-muted-foreground font-mono text-[12.5px]">
            Updated{" "}
            <b className="text-foreground font-semibold">
              <TimeAgo date={UPDATED_AT} />
            </b>
          </div>
        }
      />

      <MemberChips />

      <FilterBar facets={facets} groups={groups} />

      <div className="text-muted-foreground font-mono text-[12.5px]">
        <b className="text-foreground font-semibold">{rows.length}</b> results
        {filters.combine && " · grouped by collection"}
      </div>

      {rows.length === 0 && (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title="No objekts match"
          hint="Nothing in the catalogue fits the current filters. Widen one, or clear them all."
          action={
            <Button variant="outline" size="sm" onClick={filters.reset}>
              Clear filters
            </Button>
          }
        />
      )}

      {/* grid */}
      <ObjektGrid columns={filters.columns}>
        {rows.map(({ objekt, qty }) => (
          <ObjektCard
            key={objekt.id}
            objekt={objekt}
            selected={ids.has(objekt.id)}
            onToggleSelect={(o) => toggle(o.id)}
            onOpen={setActive}
            pin={PINNED.has(objekt.id)}
            qty={filters.combine && qty > 1 ? qty : undefined}
          >
            <ObjektCardMenu objektId={objekt.id} />
          </ObjektCard>
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

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});
