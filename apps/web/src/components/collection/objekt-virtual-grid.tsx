"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { QueryStatus } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useMemo, useRef, useLayoutEffect } from "react";
import type { WindowVirtualizerHandle, CacheSnapshot } from "virtua";
import { WindowVirtualizer } from "virtua";

import { useObjektColumn } from "@/hooks/use-objekt-column";

import { InfiniteQueryNext } from "../infinite-query-pending";
import { makeObjektRows, ObjektsRenderRow } from "./collection-render";

export type ShapedData<T = ValidObjekt[]> = [string, T[]][];

export interface ObjektVirtualGridProps<T = ValidObjekt[]> {
  shaped: ShapedData<T>;
  columns?: number;
  dataKey?: string;
  renderItem: (props: {
    item: T;
    items: T[];
    rowIndex: number;
    groupTitle: string;
  }) => ReactElement | null;
  infiniteQueryProp?: {
    status: QueryStatus;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  };
}

const cacheStore = new Map<string, [number, CacheSnapshot]>();

export function ObjektVirtualGrid<T = ValidObjekt[]>({
  shaped,
  columns: columnsProp,
  dataKey,
  renderItem,
  infiniteQueryProp,
}: ObjektVirtualGridProps<T>) {
  const { columns: contextColumns } = useObjektColumn();
  const columns = columnsProp ?? contextColumns;
  const ref = useRef<WindowVirtualizerHandle>(null);

  const [offset, cache] = useMemo(() => {
    if (!dataKey) return [undefined, undefined];
    return cacheStore.get(dataKey) ?? [undefined, undefined];
  }, [dataKey]);

  useLayoutEffect(() => {
    if (!ref.current) return;

    if (offset !== undefined) {
      window.scrollTo(0, offset);
    }

    let scrollY = 0;
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("scroll", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (dataKey && ref.current) {
        cacheStore.set(dataKey, [scrollY, ref.current.cache]);
      }
    };
  }, [dataKey, offset]);

  const virtualList = useMemo(() => {
    return shaped.flatMap(([title, items]) => [
      ...(title ? [<GroupLabelRender title={title} key={`label-${title}`} />] : []),
      ...makeObjektRows({
        items,
        columns,
        renderItem: ({ items: rowItems, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            items={rowItems}
          >
            {({ item }) => renderItem({ item, items: rowItems, rowIndex, groupTitle: title })}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [shaped, columns, renderItem]);

  return (
    <div className="[&>*>*]:will-change-transform">
      <WindowVirtualizer key={columns} ref={ref} cache={cache}>
        {virtualList}
        {infiniteQueryProp && <InfiniteQueryNext {...infiniteQueryProp} />}
      </WindowVirtualizer>
    </div>
  );
}

function GroupLabelRender({ title }: { title: string }) {
  return <div className={"pt-3 pb-3 text-base font-semibold"}>{title}</div>;
}
