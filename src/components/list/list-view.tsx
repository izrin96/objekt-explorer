"use client";

import { mapObjektWithTag, ValidObjekt } from "@/lib/universal/objekts";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { WindowVirtualizer } from "virtua";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useBreakpointColumn } from "@/hooks/use-breakpoint-column";
import { GroupLabelRender } from "../collection/label-render";
import {
  ObjektsRender,
  ObjektsRenderRow,
} from "../collection/collection-render";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { api } from "@/lib/trpc/client";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { SelectMode } from "../filters/select-mode";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import Filter from "./filter";
import { FilterContainer } from "../filters/filter-container";
import { FilterSheet } from "../filters/filter-sheet";
import { AddToList, RemoveFromList } from "./modal/manage-objekt";
import { useListAuthed, useUser } from "@/hooks/use-user";
import { Button } from "../ui";
import ObjektModal from "../objekt/objekt-modal";
import {
  AddToListMenu,
  ObjektStaticMenu,
  RemoveFromListMenu,
} from "../objekt/objekt-menu";
import { ObjektHoverMenu, ObjektSelect } from "../objekt/objekt-action";

type Props = { slug: string };

export default function ListRender(props: Props) {
  return (
    <ObjektSelectProvider>
      <ObjektModalProvider initialTab="trades">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              FallbackComponent={ErrorFallbackRender}
            >
              <ListView {...props} />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </ObjektSelectProvider>
  );
}

function ListView({ slug }: Props) {
  const { authenticated } = useUser();
  const isOwned = useListAuthed(slug);
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [objekts] = api.list.getEntries.useSuspenseQuery(slug, {
    select: (data) => data.collections.map(mapObjektWithTag),
  });

  const [objektsFiltered, setObjektsFiltered] = useState<
    [string, ObjektItem<ValidObjekt[]>[]][]
  >([]);
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([title, items]) => [
      ...(title
        ? [<GroupLabelRender title={title} key={`label-${title}`} />]
        : []),
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
                        {isOwned ? (
                          <RemoveFromListMenu slug={slug} objekt={objekt} />
                        ) : (
                          <AddToListMenu objekt={objekt} />
                        )}
                      </ObjektStaticMenu>
                    )
                  }
                >
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      objekt={objekt}
                      openObjekts={openObjekts}
                    >
                      {({ isSelected, open }) => (
                        <ObjektView
                          objekts={item.item}
                          priority={index < columns * 3}
                          isSelected={isSelected}
                          open={open}
                          showCount
                        >
                          {authenticated && (
                            <div className="absolute top-0 right-0 flex">
                              <ObjektSelect objekt={objekt} />
                              <ObjektHoverMenu>
                                {isOwned ? (
                                  <RemoveFromListMenu
                                    slug={slug}
                                    objekt={objekt}
                                  />
                                ) : (
                                  <AddToListMenu objekt={objekt} />
                                )}
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
  }, [deferredObjektsFiltered, columns, isOwned, slug, authenticated]);

  useEffect(() => {
    const shaped = shapeObjekts(filters, objekts, artists);
    const allGroupedObjekts = shaped.flatMap(([, objekts]) => objekts);
    const allObjekts = allGroupedObjekts.flatMap((item) => item.item);
    setGroupCount(allGroupedObjekts.length);
    setCount(allObjekts.length);
    setObjektsFiltered(shaped);
  }, [filters, objekts, artists]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <FilterContainer>
          <Filters
            authenticated={authenticated}
            isOwned={isOwned}
            slug={slug}
          />
        </FilterContainer>
        <FilterSheet>
          <Filters
            authenticated={authenticated}
            isOwned={isOwned}
            slug={slug}
          />
        </FilterSheet>
      </div>
      <span className="font-semibold">
        {count} total
        {filters.grouped ? ` (${groupCount} types)` : undefined}
      </span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
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
    <div className="flex flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode>
          {({ handleAction }) =>
            isOwned ? (
              <RemoveFromList slug={slug}>
                {({ open }) => (
                  <Button intent="outline" onClick={() => handleAction(open)}>
                    Remove from list
                  </Button>
                )}
              </RemoveFromList>
            ) : (
              <AddToList>
                {({ open }) => (
                  <Button intent="outline" onClick={() => handleAction(open)}>
                    Add to list
                  </Button>
                )}
              </AddToList>
            )
          }
        </SelectMode>
      )}
    </div>
  );
}
