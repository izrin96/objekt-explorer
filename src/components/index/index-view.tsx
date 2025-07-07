"use client";

import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { useConfigStore } from "@/hooks/use-hide-label";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useUser } from "@/hooks/use-user";
import { type ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { collectionOptions } from "@/lib/query-options";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { ObjektsRender, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { AddToList } from "../list/modal/manage-objekt";
import { ObjektHoverMenu, ObjektSelect } from "../objekt/objekt-action";
import { AddToListMenu, ObjektStaticMenu, SelectMenuItem } from "../objekt/objekt-menu";
import ObjektModal from "../objekt/objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import { Loader } from "../ui";
import Filter from "./filter";

export const IndexRenderDynamic = dynamic(() => Promise.resolve(IndexRender), {
  ssr: false,
});

function IndexRender() {
  return (
    <ObjektSelectProvider>
      <ObjektModalProvider initialTab="trades">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <Suspense
                fallback={
                  <div className="flex justify-center">
                    <Loader variant="ring" />
                  </div>
                }
              >
                <IndexView />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </ObjektSelectProvider>
  );
}

function IndexView() {
  const { authenticated } = useUser();
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const query = useSuspenseQuery(collectionOptions);

  const [objektsFiltered, setObjektsFiltered] = useState<[string, ObjektItem<ValidObjekt[]>[]][]>(
    [],
  );
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([title, items]) => [
      ...(title ? [<GroupLabelRender title={title} key={`label-${title}`} />] : []),
      ...ObjektsRender({
        items,
        columns,
        children: ({ items, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            items={items}
          >
            {({ item, index }) => {
              const [objekt] = item.item;
              return (
                <ObjektModal
                  key={objekt.id}
                  objekts={item.item}
                  menu={
                    authenticated && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        <AddToListMenu objekt={objekt} />
                      </ObjektStaticMenu>
                    )
                  }
                >
                  {({ openObjekts }) => (
                    <ObjektViewSelectable objekt={objekt} openObjekts={openObjekts}>
                      {({ isSelected, open }) => (
                        <ObjektView
                          objekts={item.item}
                          priority={index < columns * 3}
                          isSelected={isSelected}
                          hideLabel={hideLabel}
                          open={open}
                        >
                          {authenticated && (
                            <div className="absolute top-0 right-0 flex">
                              <ObjektSelect objekt={objekt} />
                              <ObjektHoverMenu>
                                <AddToListMenu objekt={objekt} />
                              </ObjektHoverMenu>
                            </div>
                          )}
                        </ObjektView>
                      )}
                    </ObjektViewSelectable>
                  )}
                </ObjektModal>
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [deferredObjektsFiltered, columns, authenticated, hideLabel]);

  useEffect(() => {
    const shaped = shapeObjekts(filters, query.data, artists);
    const allObjekts = shaped.flatMap(([, objekts]) => objekts);
    setCount(allObjekts.length);
    setObjektsFiltered(shaped);
  }, [filters, query.data, artists]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {authenticated && (
          <FloatingSelectMode>
            {({ handleAction }) => <AddToList handleAction={handleAction} />}
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters authenticated={authenticated} />
        </FilterContainer>
      </div>
      <span className="font-semibold">{count} total</span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}

function Filters({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode>{({ handleAction }) => <AddToList handleAction={handleAction} />}</SelectMode>
      )}
    </div>
  );
}
