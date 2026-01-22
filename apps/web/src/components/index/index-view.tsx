"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";

import type { ValidObjekt } from "@/lib/universal/objekts";

import { useCollectionObjekts } from "@/hooks/use-collection-objekt";
import { useConfigStore } from "@/hooks/use-config";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useUser } from "@/hooks/use-user";

import { makeObjektRows, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../filters/objekt/add-remove-list";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { ObjektHoverMenu, ObjektSelect } from "../objekt/objekt-action";
import { AddToListMenu, ObjektStaticMenu, SelectMenuItem } from "../objekt/objekt-menu";
import ObjektModal from "../objekt/objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import { Loader } from "../ui/loader";
import Filter from "./filter";

export const IndexRenderDynamic = dynamic(() => Promise.resolve(IndexRender), {
  ssr: false,
});

export default function IndexRender() {
  return (
    <ObjektColumnProvider>
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
    </ObjektColumnProvider>
  );
}

function IndexView() {
  const { authenticated } = useUser();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useObjektColumn();
  const { shaped, filtered } = useCollectionObjekts();

  const virtualList = useMemo(() => {
    return shaped.flatMap(([title, items]) => [
      ...(title ? [<GroupLabelRender title={title} key={`label-${title}`} />] : []),
      ...makeObjektRows({
        items,
        columns,
        renderItem: ({ items, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            items={items}
          >
            {({ item, index }) => {
              const [objekt] = item;
              return (
                <ObjektModal
                  key={objekt.id}
                  objekts={item}
                  menu={
                    authenticated && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        <AddToListMenu objekt={objekt} />
                      </ObjektStaticMenu>
                    )
                  }
                >
                  <ObjektViewSelectable objekt={objekt}>
                    {({ isSelected }) => (
                      <ObjektView
                        objekts={item}
                        priority={index < columns * 3}
                        isSelected={isSelected}
                        hideLabel={hideLabel}
                      >
                        {authenticated && (
                          <div className="absolute top-0 right-0 flex items-start">
                            <ObjektSelect objekt={objekt} />
                            <ObjektHoverMenu>
                              <AddToListMenu objekt={objekt} />
                            </ObjektHoverMenu>
                          </div>
                        )}
                      </ObjektView>
                    )}
                  </ObjektViewSelectable>
                </ObjektModal>
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [shaped, columns, authenticated, hideLabel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {authenticated && (
          <FloatingSelectMode objekts={filtered}>
            <AddToList size="sm" />
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters authenticated={authenticated} objekts={filtered} />
        </FilterContainer>
      </div>
      <span className="font-semibold">{filtered.length.toLocaleString()} total</span>

      <div className="*:overflow-visible! *:contain-[inherit]! [&>*>*]:will-change-transform">
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </div>
    </div>
  );
}

function Filters({ authenticated, objekts }: { authenticated: boolean; objekts: ValidObjekt[] }) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode objekts={objekts}>
          <AddToList />
        </SelectMode>
      )}
    </div>
  );
}
