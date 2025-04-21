"use client";

import { IndexedObjekt } from "@/lib/universal/objekts";
import {
  CSSProperties,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import ObjektView from "../objekt/objekt-view";
import { shapeIndexedObjekts } from "@/lib/filter-utils";
import { WindowVirtualizer } from "virtua";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { cn } from "@/utils/classes";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { collectionOptions } from "@/lib/query-options";
import ErrorFallbackRender from "../error-fallback";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";

export default function IndexRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <IndexView />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function IndexView() {
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const { data: objekts } = useSuspenseQuery(collectionOptions);

  const [objektsFiltered, setObjektsFiltered] = useState<
    [string, IndexedObjekt[]][]
  >([]);
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([key, objekts]) => [
      GroupLabelRender({ key }),
      ...ObjektsRender({ objekts, columns, key }),
    ]);
  }, [deferredObjektsFiltered, columns]);

  const count = useMemo(
    () => deferredObjektsFiltered.flatMap(([, objekts]) => objekts).length,
    [deferredObjektsFiltered]
  );

  useEffect(() => {
    setObjektsFiltered(shapeIndexedObjekts(filters, objekts, artists));
  }, [filters, objekts, artists]);

  return (
    <div className="flex flex-col gap-2">
      <FilterView artists={artists} />
      <span className="font-semibold">{count} total</span>

      <ObjektModalProvider initialTab="trades">
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </ObjektModalProvider>
    </div>
  );
}

export function GroupLabelRender({ key }: { key: string }) {
  return (
    <div
      key={key}
      className={cn("font-semibold text-base pb-3 pt-3", !key && "hidden")}
    >
      {key}
    </div>
  );
}

function ObjektsRender({
  key,
  objekts,
  columns,
}: {
  key: string;
  objekts: IndexedObjekt[];
  columns: number;
}) {
  return Array.from({
    length: Math.ceil(objekts.length / columns),
  }).map((_, i) => {
    return (
      <ObjektsRowRender
        key={`${key}_${i}`}
        rowIndex={i}
        columns={columns}
        objekts={objekts}
      />
    );
  });
}

function ObjektsRowRender({
  rowIndex,
  objekts,
  columns,
}: {
  rowIndex: number;
  objekts: IndexedObjekt[];
  columns: number;
}) {
  const start = rowIndex * columns;
  const end = start + columns;
  return (
    <div
      className="grid grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))] gap-3 lg:gap-4 pb-4"
      style={{ "--grid-columns": columns } as CSSProperties}
    >
      {objekts.slice(start, end).map((objekt, j) => {
        const index = rowIndex * columns + j;
        return (
          <ObjektView
            key={objekt.slug}
            objekts={[objekt]}
            priority={index < columns * 3}
          />
        );
      })}
    </div>
  );
}
