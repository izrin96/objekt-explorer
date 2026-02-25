"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";

import { useCollectionObjekts } from "@/hooks/use-collection-objekt";
import { useConfigStore } from "@/hooks/use-config";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useSession } from "@/hooks/use-user";

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

export default dynamic(() => Promise.resolve(IndexRender), {
  ssr: false,
});

function IndexRender() {
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
  const t = useTranslations("common.count");
  const { data: session } = useSession();
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
            {({ item }) => {
              const [objekt] = item as [ValidObjekt];
              return (
                <ObjektModal
                  key={objekt.id}
                  objekts={item}
                  menu={
                    session && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        <AddToListMenu objekt={objekt} />
                      </ObjektStaticMenu>
                    )
                  }
                >
                  <ObjektViewSelectable objekt={objekt}>
                    {({ isSelected }) => (
                      <ObjektView objekts={item} isSelected={isSelected} hideLabel={hideLabel}>
                        {session && (
                          <div className="flex items-start self-start justify-self-end">
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
  }, [shaped, columns, session, hideLabel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {session && (
          <FloatingSelectMode objekts={filtered}>
            <AddToList size="sm" />
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <div className="flex w-full flex-col gap-6">
            <Filter />
            {session && (
              <SelectMode objekts={filtered}>
                <AddToList />
              </SelectMode>
            )}
          </div>
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {t("total", { count: filtered.length.toLocaleString() })}
      </span>

      <div className="[&>*>*]:will-change-transform">
        <WindowVirtualizer key={columns}>{virtualList}</WindowVirtualizer>
      </div>
    </div>
  );
}
