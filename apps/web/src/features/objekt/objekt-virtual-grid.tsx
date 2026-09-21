import { CaretDownIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { type ReactElement, useMemo } from "react";
import { InView } from "react-intersection-observer";
import { WindowVirtualizer } from "virtua";

import { Spinner } from "@/components/ui/spinner";
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
  /** pinned objekts lead their group, in the owner's order */
  isProfile?: boolean;
  rarityMap?: Map<string, number>;
  /** paged surfaces fetch the next page as the tail row comes into view */
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
};

export function ObjektVirtualGrid({
  objekts,
  filters,
  columns: columnsProp,
  renderItem,
  isProfile = false,
  rarityMap,
  onLoadMore,
  hasNextPage = false,
  isFetchingNextPage = false,
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

  return (
    <>
      {/* `key`: every row's height changes with the column count, and virtua
          keeps the measurements it already took */}
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
    </>
  );
}
