import { FlagBannerFoldIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { QueryStatus } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { InView } from "react-intersection-observer";
import { WindowVirtualizer } from "virtua";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilterData } from "@/hooks/use-filter-data";
import type { Filters } from "@/hooks/use-filters";
import { useObjektColumn } from "@/hooks/use-objekt-column";

import { Loader } from "../intentui/loader";
import { buildVirtualData } from "./build-virtual-data";
import { ObjektsRenderRow } from "./collection-render";

type LoadMoreValue = {
  status: QueryStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
};

const LoadMoreContext = createContext<LoadMoreValue | null>(null);

export interface ObjektVirtualGridProps {
  objekts: ValidObjekt[];
  filters: Filters;
  columns?: number;
  renderItem: (props: {
    item: ValidObjekt[];
    rowIndex: number;
    groupTitle: string;
  }) => ReactElement | null;
  isProfile?: boolean;
  rarityMap?: Map<string, number>;
}

function ObjektVirtualGridBase({
  objekts,
  filters,
  columns: columnsProp,
  renderItem,
  isProfile = false,
  rarityMap,
}: ObjektVirtualGridProps) {
  const { columns: contextColumns } = useObjektColumn();
  const columns = columnsProp ?? contextColumns;
  const { compareSeason, compareClass } = useFilterData();
  const { getArtist, compareMember } = useCosmoArtist();
  const loadMore = useContext(LoadMoreContext);

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
        hasNextPage: loadMore?.hasNextPage,
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
      loadMore?.hasNextPage,
    ],
  );

  return (
    <>
      <WindowVirtualizer
        data={data}
        key={columns}
        item={(props) => (
          <div ref={props.ref} style={props.style} className="will-change-transform">
            {props.children}
          </div>
        )}
      >
        {(item) => {
          if (item.type === "sentinel") {
            if (loadMore) {
              return (
                <InView
                  as="div"
                  className="h-0"
                  onChange={(inView) => {
                    if (inView && loadMore.hasNextPage && !loadMore.isFetchingNextPage) {
                      loadMore.fetchNextPage();
                    }
                  }}
                />
              );
            }
            return <div className="h-0" />;
          }
          if (item.type === "label") {
            return <GroupLabelRender title={item.title} />;
          }
          return (
            <ObjektsRenderRow columns={columns} rowIndex={item.rowIndex} items={item.items}>
              {({ item: cell }) =>
                renderItem({
                  item: cell,
                  rowIndex: item.rowIndex,
                  groupTitle: item.groupTitle,
                })
              }
            </ObjektsRenderRow>
          );
        }}
      </WindowVirtualizer>

      {loadMore?.hasNextPage && (
        <div className="flex justify-center py-6">
          <Loader variant="ring" />
        </div>
      )}
      {loadMore?.status === "success" &&
        !loadMore.hasNextPage &&
        !loadMore.isFetchingNextPage &&
        data.length > 0 && (
          <div className="flex justify-center py-6">
            <FlagBannerFoldIcon size={32} weight="light" />
          </div>
        )}
    </>
  );
}

function GroupLabelRender({ title }: { title: string }) {
  return <div className="pt-3 pb-3 text-base font-semibold">{title}</div>;
}

export type LoadMoreProps = {
  status: QueryStatus;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  children: ReactNode;
};

function LoadMoreProvider({ children, ...queryProps }: LoadMoreProps) {
  return <LoadMoreContext value={queryProps}>{children}</LoadMoreContext>;
}

export { ObjektVirtualGridBase as ObjektVirtualGrid };
export { LoadMoreProvider as ObjektVirtualGridLoadMore };
