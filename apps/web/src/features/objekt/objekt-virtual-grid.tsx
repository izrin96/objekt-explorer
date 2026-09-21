import type { ValidObjekt } from "@repo/lib/types/objekt";
import { type ReactElement, useMemo } from "react";
import { WindowVirtualizer } from "virtua";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import type { FilterSearch } from "@/features/filters/search-schema";
import { useColumns } from "@/stores/columns";

import { buildVirtualData } from "./build-virtual-data";
import { ObjektGrid } from "./objekt-grid";

type ObjektVirtualGridProps = {
  objekts: ValidObjekt[];
  filters: FilterSearch;
  /** overrides the shared column setting */
  columns?: number;
  renderItem: (props: {
    item: ValidObjekt[];
    rowIndex: number;
    groupTitle: string;
  }) => ReactElement | null;
  rarityMap?: Map<string, number>;
};

export function ObjektVirtualGrid({
  objekts,
  filters,
  columns: columnsProp,
  renderItem,
  rarityMap,
}: ObjektVirtualGridProps) {
  const responsiveColumns = useColumns();
  const columns = columnsProp ?? responsiveColumns;
  const { compareSeason, compareClass } = useFilterData();
  const { getArtist, compareMember } = useCosmoArtist();

  const data = useMemo(
    () =>
      buildVirtualData({
        objekts,
        filters,
        columns,
        getArtist,
        compareMember,
        compareSeason,
        compareClass,
        rarityMap,
      }),
    [objekts, filters, columns, getArtist, compareMember, compareSeason, compareClass, rarityMap],
  );

  return (
    // `key`: every row's height changes with the column count, and virtua keeps
    // the measurements it already took
    <WindowVirtualizer key={columns} data={data}>
      {(item) =>
        item.type === "label" ? (
          <div className="font-display pt-3 pb-3 text-base font-semibold">{item.title}</div>
        ) : (
          <ObjektGrid columns={columns} className="pb-3">
            {item.items.map((cell, index) => (
              <div key={cell[0]?.id ?? index} className="contents">
                {renderItem({ item: cell, rowIndex: item.rowIndex, groupTitle: item.groupTitle })}
              </div>
            ))}
          </ObjektGrid>
        )
      }
    </WindowVirtualizer>
  );
}
