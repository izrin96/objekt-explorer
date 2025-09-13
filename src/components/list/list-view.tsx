"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";
import { useConfigStore } from "@/hooks/use-config";
import { useFilters } from "@/hooks/use-filters";
import { useListObjekts } from "@/hooks/use-list-objekt";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useTarget } from "@/hooks/use-target";
import { useListAuthed, useUser } from "@/hooks/use-user";
import type { PublicList } from "@/lib/universal/user";
import { makeObjektRows, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
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
import Filter from "./filter";
import { AddToList, RemoveFromList } from "./modal/manage-objekt";

export default function ListRender() {
  const list = useTarget((a) => a.list)!;
  return (
    <ObjektColumnProvider initialColumn={list.gridColumns}>
      <ObjektSelectProvider>
        <ObjektModalProvider initialTab="trades">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
                <ListView list={list} />
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </ObjektModalProvider>
      </ObjektSelectProvider>
    </ObjektColumnProvider>
  );
}

function ListView({ list }: { list: PublicList }) {
  const { authenticated } = useUser();
  const isOwned = useListAuthed(list.slug);
  const [filters] = useFilters();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useObjektColumn();
  const objekts = useListObjekts(list.slug);
  const deferredObjekts = useDeferredValue(objekts);

  const [groupCount, count] = useMemo(() => {
    const groupedObjekts = deferredObjekts.flatMap(([, objekts]) => objekts);
    return [groupedObjekts.length, groupedObjekts.flatMap((item) => item.item).length];
  }, [deferredObjekts]);

  const virtualList = useMemo(() => {
    return deferredObjekts.flatMap(([title, items]) => [
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
              const [objekt] = item.item;
              return (
                <ObjektModal
                  key={objekt.id}
                  objekts={item.item}
                  menu={
                    authenticated && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        {isOwned && <RemoveFromListMenu slug={list.slug} objekt={objekt} />}
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
                          showCount
                        >
                          {authenticated && (
                            <div className="absolute top-0 right-0 flex">
                              <ObjektSelect objekt={objekt} />
                              <ObjektHoverMenu>
                                {isOwned && <RemoveFromListMenu slug={list.slug} objekt={objekt} />}
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
  }, [deferredObjekts, columns, isOwned, list.slug, authenticated, hideLabel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {authenticated && (
          <FloatingSelectMode>
            {({ handleAction }) => (
              <>
                {isOwned && <RemoveFromList slug={list.slug} handleAction={handleAction} />}
                <AddToList handleAction={handleAction} />
              </>
            )}
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters authenticated={authenticated} isOwned={isOwned} slug={list.slug} />
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {count.toLocaleString()} total
        {filters.grouped ? ` (${groupCount.toLocaleString()} types)` : ""}
      </span>

      <div className="[&>*]:!overflow-visible [&>*]:!contain-[inherit] [&>*>*]:will-change-transform">
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </div>
    </div>
  );
}

function Filters({
  authenticated,
  isOwned,
  slug,
}: {
  authenticated: boolean;
  isOwned: boolean;
  slug: string;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode>
          {({ handleAction }) => (
            <>
              {isOwned && <RemoveFromList slug={slug} handleAction={handleAction} />}
              <AddToList handleAction={handleAction} />
            </>
          )}
        </SelectMode>
      )}
    </div>
  );
}
