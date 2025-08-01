"use client";

import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { WindowVirtualizer } from "virtua";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";
import { useConfigStore } from "@/hooks/use-config";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { useListAuthed, useUser } from "@/hooks/use-user";
import { type ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { orpc } from "@/lib/orpc/client";
import { mapObjektWithTag, type ValidObjekt } from "@/lib/universal/objekts";
import { ObjektsRender, ObjektsRenderRow } from "../collection/collection-render";
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

type Props = { slug: string };

export default function ListRender(props: Props) {
  return (
    <ObjektSelectProvider>
      <ObjektModalProvider initialTab="trades">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
              <ListView {...props} />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </ObjektSelectProvider>
  );
}

function ListView({ slug }: Props) {
  const { getSelectedArtistIds } = useCosmoArtist();
  const { authenticated } = useUser();
  const isOwned = useListAuthed(slug);
  const { artists, getArtist } = useCosmoArtist();
  const [filters] = useFilters();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const { data: objekts } = useSuspenseQuery(
    orpc.list.listEntries.queryOptions({
      input: slug,
      select: (data) => data.map(mapObjektWithTag),
    }),
  );

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
                        {isOwned && <RemoveFromListMenu slug={slug} objekt={objekt} />}
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
                                {isOwned && <RemoveFromListMenu slug={slug} objekt={objekt} />}
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
  }, [deferredObjektsFiltered, columns, isOwned, slug, authenticated, hideLabel]);

  useEffect(() => {
    const shaped = shapeObjekts(
      {
        ...filters,
        artist: getSelectedArtistIds(filters.artist),
      },
      objekts,
      artists,
      getArtist,
    );
    const allGroupedObjekts = shaped.flatMap(([, objekts]) => objekts);
    const allObjekts = allGroupedObjekts.flatMap((item) => item.item);
    setGroupCount(allGroupedObjekts.length);
    setCount(allObjekts.length);
    setObjektsFiltered(shaped);
  }, [filters, objekts, artists, getSelectedArtistIds]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        {authenticated && (
          <FloatingSelectMode>
            {({ handleAction }) => (
              <>
                {isOwned && <RemoveFromList slug={slug} handleAction={handleAction} />}
                <AddToList handleAction={handleAction} />
              </>
            )}
          </FloatingSelectMode>
        )}
        <FilterContainer>
          <Filters authenticated={authenticated} isOwned={isOwned} slug={slug} />
        </FilterContainer>
      </div>
      <span className="font-semibold">
        {count.toLocaleString()} total
        {filters.grouped ? ` (${groupCount} types)` : undefined}
      </span>

      <WindowVirtualizer key={`${columns}-${hideLabel}`}>{virtualList}</WindowVirtualizer>
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
