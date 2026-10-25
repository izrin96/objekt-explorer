import { CaretDownIcon } from "@phosphor-icons/react";
import type { GridObjekt } from "@repo/lib/types/objekt";
import { type ReactElement, memo, useMemo } from "react";
import { InView } from "react-intersection-observer";
import { WindowVirtualizer } from "virtua";

import { Spinner } from "@/components/ui/spinner";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useFilterData } from "@/features/filters/filter-data-provider";
import type { FilterSearch } from "@/features/filters/search-schema";
import { useWindowVirtualizerRestore } from "@/lib/use-window-virtualizer-restore";
import { useColumns } from "@/stores/columns";

import { type VirtualItem, buildVirtualData } from "./build-virtual-data";
import { ObjektGrid } from "./objekt-grid";
import { SelectionOrderContext } from "./selection-order";

type RenderItem<T extends GridObjekt> = (props: {
  item: T[];
  rowIndex: number;
  groupTitle: string;
}) => ReactElement | null;

type ObjektVirtualGridProps<T extends GridObjekt> = {
  objekts: T[];
  filters: FilterSearch;
  /** overrides the shared column setting */
  columns?: number;
  renderItem: RenderItem<T>;
  /** pinned objekts lead their group, in the owner's order */
  isProfile?: boolean;
  rarityMap?: Map<string, number>;
  /** paged surfaces fetch the next page as the tail row comes into view */
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
};

export function ObjektVirtualGrid<T extends GridObjekt>({
  objekts,
  filters,
  columns: columnsProp,
  renderItem,
  isProfile = false,
  rarityMap,
  onLoadMore,
  hasNextPage = false,
  isFetchingNextPage = false,
}: ObjektVirtualGridProps<T>) {
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
        isProfile,
        rarityMap,
      }),
    [
      objekts,
      filters,
      columns,
      getArtist,
      compareMember,
      compareSeason,
      compareClass,
      isProfile,
      rarityMap,
    ],
  );

  const order = useMemo(
    () =>
      data.flatMap((item) =>
        item.type === "label" ? [] : item.items.flatMap((cell) => (cell[0] ? [cell[0].id] : [])),
      ),
    [data],
  );

  const { ref: virtualizerRef, cache: virtualizerCache } = useWindowVirtualizerRestore({
    count: data.length,
    layoutKey: columns,
    enabled: data.length > 0,
  });

  return (
    <SelectionOrderContext value={order}>
      {/* `key`: every row's height changes with the column count, and virtua
          keeps the measurements it already took */}
      <WindowVirtualizer key={columns} ref={virtualizerRef} cache={virtualizerCache} data={data}>
        {(item) =>
          item.type === "label" ? (
            <div className="font-display pt-3 pb-3 text-base font-semibold">{item.title}</div>
          ) : (
            <GridRow row={item} columns={columns} renderItem={renderItem} />
          )
        }
      </WindowVirtualizer>

      {onLoadMore !== undefined && hasNextPage && (
        <InView
          as="div"
          className="flex justify-center py-6"
          onChange={(inView) => {
            if (inView && !isFetchingNextPage) onLoadMore();
          }}
        >
          {isFetchingNextPage ? (
            <Spinner className="size-4" />
          ) : (
            <CaretDownIcon className="text-muted-foreground size-4" aria-hidden />
          )}
        </InView>
      )}
    </SelectionOrderContext>
  );
}

/**
 * virtua calls its render function for every visible row on each scroll update, so without the
 * memo every card on screen renders again while the page scrolls.
 */
const GridRow = memo(function GridRow({
  row,
  columns,
  renderItem,
}: {
  row: Extract<VirtualItem, { type: "row" }>;
  columns: number;
  renderItem: RenderItem<GridObjekt>;
}) {
  return (
    <ObjektGrid columns={columns} className="pb-(--gutter)">
      {row.items.map((cell, index) => (
        <div key={cell[0]?.id ?? index} className="contents">
          {renderItem({ item: cell, rowIndex: row.rowIndex, groupTitle: row.groupTitle })}
        </div>
      ))}
    </ObjektGrid>
  );
}) as <T extends GridObjekt>(props: {
  row: Extract<VirtualItem<T>, { type: "row" }>;
  columns: number;
  renderItem: RenderItem<T>;
}) => ReactElement;
