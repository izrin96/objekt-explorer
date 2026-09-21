import {
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  SelectionPlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { CompareBanner } from "@/components/compare/compare-banner";
import { isComparing, useCompareFilters } from "@/components/compare/compare-filters";
import { useCompareResult } from "@/components/compare/compare-result";
import { useScopedFacets } from "@/components/filters/facets";
import { FilterBar } from "@/components/filters/filter-bar";
import { applyFilters, NO_IDS, useFilters } from "@/components/filters/filter-store";
import { ObjektCard } from "@/components/objekt-card";
import { ObjektDrawer } from "@/components/objekt-drawer";
import { ObjektGrid } from "@/components/objekt-grid";
import { SetPriceDialog } from "@/components/profile/set-price-dialog";
import { SelectBar, selectBarActionClass, selectBarFillClass } from "@/components/select-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { type LabObjekt, objektById } from "@/fixtures/objekts";
import { type LabList, useLists } from "@/store/lists";
import { useSelection } from "@/store/selection";

/** the app renders `MYR 12.30`; the currency is the list's, not the viewer's */
function formatPrice(currency: string, price: number): string {
  return `${currency || "MYR"} ${price.toFixed(2)}`;
}

/** what an empty comparison means, per mode */
const NOTHING_HINT = {
  missing: "The target already holds every objekt in this list.",
  matches: "The target holds none of the objekts in this list.",
} as const;

/**
 * Port of `list/list-view.tsx`: the shared filter bar over the list's entries,
 * the same card interaction as Home and Market (body opens the drawer, the
 * round check toggles the shared selection), and a select bar carrying the
 * list-scoped actions.
 *
 * While the `cmp_*` params are set the grid shows the comparison instead of the
 * list's own entries. The filters still apply on top of the result, the way the
 * app runs `filterObjekts` over whichever of the two queries is live.
 */
export function ListView({ list }: { list: LabList }) {
  const filters = useFilters();
  const { ids, toggle, clear } = useSelection();
  const [active, setActive] = useState<LabObjekt | null>(null);
  const removeEntries = useLists((s) => s.removeEntries);
  const setPrices = useLists((s) => s.setPrices);
  const isSale = list.type === "sale";

  const [compare, setCompare] = useCompareFilters();
  const comparing = isComparing(compare);

  // the selection store is shared with every other surface; start clean
  useEffect(() => useSelection.getState().clear, []);

  // an entry is a stored objekt id, so a fixture that went away is simply dropped
  const entryObjekts = useMemo(
    () =>
      list.entries
        .map((entry) => objektById.get(entry.objektId))
        .filter((objekt): objekt is LabObjekt => objekt !== undefined),
    [list.entries],
  );
  const prices = useMemo(
    () => new Map(list.entries.map((entry) => [entry.objektId, entry.price])),
    [list.entries],
  );

  const result = useCompareResult(entryObjekts, comparing ? compare : null);
  const objekts = result?.ok === true ? result.objekts : entryObjekts;

  const { facets, groups, scope } = useScopedFacets(objekts);
  const rows = useMemo(
    () => applyFilters(objekts, filters, NO_IDS, NO_IDS, scope),
    [objekts, filters, scope],
  );
  const visibleIds = rows.map((r) => r.objekt.id);
  const selected = [...ids];

  const clearCompare = () => setCompare(null);

  // a target that does not resolve replaces the whole view, as it does in the
  // app — there is no list to fall back to while the URL still asks for a compare
  if (comparing && result?.ok === false) {
    return <CompareBanner compare={compare} onClear={clearCompare} error={result.message} />;
  }

  if (list.entries.length === 0 && !comparing) {
    return (
      <EmptyState
        icon={SelectionPlusIcon}
        title="This list is empty"
        hint="Pick objekts on any grid with the round check on the card, then use “Add to list” on the selection bar."
        action={
          <Button variant="outline" size="sm" render={<Link to="/" />}>
            Browse objekts
          </Button>
        }
      />
    );
  }

  return (
    <>
      <FilterBar facets={facets} groups={groups} />

      {comparing && <CompareBanner compare={compare} onClear={clearCompare} />}

      <div className="text-muted-foreground font-mono text-[12.5px]">
        <b className="text-foreground font-semibold">{rows.length}</b> of {objekts.length} objekts
        {filters.combine && " · grouped by collection"}
      </div>

      {objekts.length === 0 && comparing && (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title="Nothing to show"
          hint={NOTHING_HINT[compare.cmp_mode]}
        />
      )}

      {objekts.length > 0 && rows.length === 0 && (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title="No objekts match"
          hint="Every objekt in this list is filtered out by the current facets."
          action={
            <Button variant="outline" size="sm" onClick={filters.reset}>
              Clear filters
            </Button>
          }
        />
      )}

      <ObjektGrid columns={filters.columns}>
        {rows.map(({ objekt, qty }) => {
          const price = prices.get(objekt.id);
          return (
            <ObjektCard
              key={objekt.id}
              objekt={objekt}
              selected={ids.has(objekt.id)}
              onToggleSelect={(o) => toggle(o.id)}
              onOpen={setActive}
              qty={filters.combine && qty > 1 ? qty : undefined}
              price={
                isSale
                  ? price === undefined
                    ? "No price"
                    : formatPrice(list.currency, price)
                  : undefined
              }
              priceMuted={isSale && price === undefined}
            />
          );
        })}
      </ObjektGrid>

      {/* the bar keeps working while comparing — only the two actions that
          write to the list are gone, since what is on screen is a comparison
          against another target and not the list's own contents */}
      <SelectBar visibleIds={visibleIds}>
        {!comparing && (
          <>
            <Button
              size="sm"
              onClick={() => {
                removeEntries(list.id, selected);
                toastManager.add({
                  type: "success",
                  title: `Removed ${selected.length} objekt${selected.length === 1 ? "" : "s"}`,
                  description: `from “${list.name}”`,
                });
                clear();
              }}
              className={`${selectBarFillClass} shrink-0`}
            >
              <TrashIcon />
              Remove from list
            </Button>
            {isSale && (
              <SetPriceDialog
                count={ids.size}
                currency={list.currency}
                onSave={(price) => {
                  setPrices(list.id, selected, price);
                  clear();
                }}
              >
                <Button size="sm" variant="outline" className={`${selectBarActionClass} shrink-0`}>
                  <CurrencyDollarIcon />
                  Set price
                </Button>
              </SetPriceDialog>
            )}
          </>
        )}
      </SelectBar>

      <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
    </>
  );
}
