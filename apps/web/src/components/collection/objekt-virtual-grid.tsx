"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { QueryStatus } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { WindowVirtualizer } from "virtua";

import { useObjektColumn } from "@/hooks/use-objekt-column";

import { InfiniteQueryNext } from "../infinite-query-pending";
import { makeObjektRows, ObjektsRenderRow } from "./collection-render";

export type ShapedData<T = ValidObjekt[]> = [string, T[]][];

export interface ObjektVirtualGridProps<T = ValidObjekt[]> {
  shaped: ShapedData<T>;
  columns?: number;
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

export function ObjektVirtualGrid<T = ValidObjekt[]>({
  shaped,
  columns: columnsProp,
  renderItem,
  infiniteQueryProp,
}: ObjektVirtualGridProps<T>) {
  const { columns: contextColumns } = useObjektColumn();
  const columns = columnsProp ?? contextColumns;

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
      <WindowVirtualizer key={columns}>
        {virtualList}
        {infiniteQueryProp && <InfiniteQueryNext {...infiniteQueryProp} />}
      </WindowVirtualizer>
    </div>
  );
}

function GroupLabelRender({ title }: { title: string }) {
  return <div className={"pt-3 pb-3 text-base font-semibold"}>{title}</div>;
}
