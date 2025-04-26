"use client";

import { IndexedObjekt } from "@/lib/universal/objekts";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import { shapeIndexedObjekts } from "@/lib/filter-utils";
import { WindowVirtualizer } from "virtua";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { collectionOptions } from "@/lib/query-options";
import ErrorFallbackRender from "../error-boundary";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";
import { GroupLabelRender } from "../collection/label-render";
import {
  ObjektsRender,
  ObjektsRenderRow,
} from "../collection/collection-render";
import ObjektView from "../objekt/objekt-view";

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
    return deferredObjektsFiltered.flatMap(([title, objekts]) => [
      !!title && <GroupLabelRender title={title} key={`label-${title}`} />,
      ...ObjektsRender({
        objekts: objekts.map((ob) => [ob]),
        columns,
        children: ({ objekts, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            objekts={objekts}
          >
            {({ objekts, index }) => {
              const [objekt] = objekts;
              return (
                <ObjektView
                  key={objekt.id}
                  objekts={objekts}
                  priority={index < columns * 3}
                />
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
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
