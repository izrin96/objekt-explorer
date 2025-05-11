"use client";

import { ValidObjekt } from "@/lib/universal/objekts";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { WindowVirtualizer } from "virtua";
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
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
import { ObjektTabProvider } from "@/hooks/use-objekt-tab";
import { api } from "@/lib/trpc/client";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { SelectMode } from "../filters/select-mode";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import Filter from "./filter";
import { FilterContainer } from "../filters/filter-container";
import { FilterSheet } from "../filters/filter-sheet";

type Props = { slug: string; isOwned: boolean };

export default function ListRender(props: Props) {
  return (
    <ObjektSelectProvider>
      <ObjektTabProvider initialTab="trades">
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
      </ObjektTabProvider>
    </ObjektSelectProvider>
  );
}

function ListView({ slug, isOwned }: Props) {
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [{ collections: objekts }] = api.list.getEntries.useSuspenseQuery(slug);

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
                <ObjektModalProvider key={objekt.id} objekts={item.item}>
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      objekt={objekt}
                      openObjekts={openObjekts}
                      enableSelect={isOwned}
                    >
                      {({ isSelected, open, select }) => (
                        <ObjektView
                          objekts={item.item}
                          priority={index < columns * 3}
                          isSelected={isSelected}
                          open={open}
                          select={select}
                          showCount
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
  }, [deferredObjektsFiltered, columns, isOwned]);

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
          <Filters isOwned={isOwned} slug={slug} />
        </FilterContainer>
        <FilterSheet>
          <Filters isOwned={isOwned} slug={slug} />
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

function Filters({ isOwned, slug }: { isOwned: boolean; slug: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Filter />
      {isOwned && <SelectMode state="remove" slug={slug} />}
    </div>
  );
}
