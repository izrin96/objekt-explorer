"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
import { ObjektTabProvider } from "@/hooks/use-objekt-tab";
import { SelectMode } from "../filters/select-mode";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import { authClient } from "@/lib/auth-client";
import Filter from "./filter";
import { ValidObjekt } from "@/lib/universal/objekts";

export default function IndexRender() {
  return (
    <ObjektSelectProvider>
      <ObjektTabProvider initialTab="trades">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              FallbackComponent={ErrorFallbackRender}
            >
              <IndexView />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektTabProvider>
    </ObjektSelectProvider>
  );
}

function IndexView() {
  const { data: session } = authClient.useSession();
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const { data: objekts } = useSuspenseQuery(collectionOptions);

  const [objektsFiltered, setObjektsFiltered] = useState<
    [string, ValidObjekt[]][]
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
                <ObjektModalProvider key={objekt.id} objekts={objekts}>
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      getId={() => objekt.slug}
                      openObjekts={openObjekts}
                      enableSelect={!!session}
                    >
                      {({ isSelected, open, select }) => (
                        <ObjektView
                          objekts={objekts}
                          priority={index < columns * 3}
                          isSelected={isSelected}
                          open={open}
                          select={select}
                        />
                      )}
                    </ObjektViewSelectable>
                  )}
                </ObjektModalProvider>
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [deferredObjektsFiltered, columns, session]);

  const count = useMemo(
    () => deferredObjektsFiltered.flatMap(([, objekts]) => objekts).length,
    [deferredObjektsFiltered]
  );

  useEffect(() => {
    setObjektsFiltered(shapeIndexedObjekts(filters, objekts, artists));
  }, [filters, objekts, artists]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <Filter />
        {session && <SelectMode state="add" />}
      </div>
      <span className="font-semibold">{count} total</span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}
