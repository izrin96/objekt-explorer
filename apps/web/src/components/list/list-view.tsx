"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";

import { useConfigStore } from "@/hooks/use-config";
import { useListObjekts } from "@/hooks/use-list-objekt";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { useListAuthed, useSession } from "@/hooks/use-user";

import { makeObjektRows, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { AddToList, RemoveFromList } from "../filters/objekt/add-remove-list";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { ObjektHoverMenu, ObjektSelect } from "../objekt/objekt-action";
import {
  AddToListMenu,
  ObjektStaticMenu,
  RemoveFromListMenu,
  SelectMenuItem,
} from "../objekt/objekt-menu";
import ObjektModal from "../objekt/objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import { Loader } from "../ui/loader";
import Filter from "./filter";

export default function ListRender() {
  const list = useTarget((a) => a.list)!;
  return (
    <ObjektColumnProvider initialColumn={list.gridColumns}>
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
                  <ListView />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </ObjektModalProvider>
      </ObjektSelectProvider>
    </ObjektColumnProvider>
  );
}

function ListView() {
  const t = useTranslations("common.count");
  const { data: session } = useSession();
  const isOwned = useListAuthed();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useObjektColumn();
  const { shaped, filtered, grouped, filters } = useListObjekts();

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
              const [objekt] = item as [ValidObjekt];
              return (
                <ObjektModal
                  key={objekt.id}
                  objekts={item}
                  menu={
                    session && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        {isOwned && <RemoveFromListMenu objekt={objekt} />}
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
                        showCount
                      >
                        {session && (
                          <div className="flex items-start self-start justify-self-end">
                            <ObjektSelect objekt={objekt} />
                            <ObjektHoverMenu>
                              {isOwned && <RemoveFromListMenu objekt={objekt} />}
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
  }, [shaped, columns, isOwned, session, hideLabel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {session && (
          <FloatingSelectMode objekts={filtered}>
            {isOwned && <RemoveFromList size="sm" />}
            <AddToList size="sm" />
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <div className="flex w-full flex-col gap-6">
            <Filter objekts={filtered} />
            {session && (
              <SelectMode objekts={filtered}>
                {isOwned && <RemoveFromList />}
                <AddToList />
              </SelectMode>
            )}
          </div>
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {t("total", { count: filtered.length.toLocaleString() })}
        {filters.grouped ? ` (${t("types", { count: grouped.length.toLocaleString() })})` : ""}
      </span>

      <div className="[&>*>*]:will-change-transform">
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </div>
    </div>
  );
}
