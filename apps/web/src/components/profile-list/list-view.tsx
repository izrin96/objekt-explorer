"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";
import { useConfigStore } from "@/hooks/use-config";
import { useProfileListObjekts } from "@/hooks/use-list-objekt";
import { ObjektColumnProvider, useObjektColumn } from "@/hooks/use-objekt-column";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useProfileListAuthed, useTarget } from "@/hooks/use-target";
import { useSession } from "@/hooks/use-user";
import type { ValidObjekt } from "@/lib/universal/objekts";
import { makeObjektRows, ObjektsRenderRow } from "../collection/collection-render";
import { GroupLabelRender } from "../collection/label-render";
import ErrorFallbackRender from "../error-boundary";
import { FilterContainer } from "../filters/filter-container";
import { FloatingSelectMode, SelectMode } from "../filters/select-mode";
import { ObjektHoverMenu, ObjektSelect } from "../objekt/objekt-action";
import { ObjektStaticMenu, SelectMenuItem } from "../objekt/objekt-menu";
import ObjektModal from "../objekt/objekt-modal";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import Filter from "./filter";

export default function ProfileListRender() {
  const list = useTarget((a) => a.profileList)!;
  return (
    <ObjektColumnProvider initialColumn={list.gridColumns}>
      <ObjektSelectProvider>
        <ObjektModalProvider initialTab="trades">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
                <ProfileListView />
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </ObjektModalProvider>
      </ObjektSelectProvider>
    </ObjektColumnProvider>
  );
}

function ProfileListView() {
  const list = useTarget((a) => a.profileList)!;
  const { data: user } = useSession();
  const isOwned = useProfileListAuthed();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useObjektColumn();
  const { shaped, filtered, grouped, filters } = useProfileListObjekts(list.slug);

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
                    user && (
                      <ObjektStaticMenu>
                        <SelectMenuItem objekt={objekt} />
                        {/* {isOwned && <RemoveFromListMenu objekt={objekt} />} */}
                        {/* <AddToListMenu objekt={objekt} /> */}
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
                        showSerial={!filters.grouped}
                      >
                        {user && (
                          <div className="absolute top-0 right-0 flex items-start">
                            <ObjektSelect objekt={objekt} />
                            <ObjektHoverMenu>
                              {/* {isOwned && <RemoveFromListMenu objekt={objekt} />} */}
                              {/* <AddToListMenu objekt={objekt} /> */}
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
  }, [shaped, columns, isOwned, user, hideLabel]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {user && (
          <FloatingSelectMode objekts={filtered}>
            {/* {isOwned && <RemoveFromList size="sm" />}
            <AddToList size="sm" /> */}
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters authenticated={user !== null} isOwned={isOwned} objekts={filtered} />
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {filtered.length.toLocaleString()} total
        {filters.grouped ? ` (${grouped.length.toLocaleString()} types)` : ""}
      </span>

      <div className="*:overflow-visible! *:contain-[inherit]! [&>*>*]:will-change-transform">
        <WindowVirtualizer>{virtualList}</WindowVirtualizer>
      </div>
    </div>
  );
}

function Filters({
  authenticated,
  isOwned,
  objekts,
}: {
  authenticated: boolean;
  isOwned: boolean;
  objekts: ValidObjekt[];
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode objekts={objekts}>
          {/* {isOwned && <RemoveFromList />} */}
          {/* <AddToList /> */}
        </SelectMode>
      )}
    </div>
  );
}
