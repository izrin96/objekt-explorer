"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { ObjektItem, shapeObjekts } from "@/lib/filter-utils";
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
import Filter from "./filter";
import { ValidObjekt } from "@/lib/universal/objekts";
import { FilterSheet } from "../filters/filter-sheet";
import { FilterContainer } from "../filters/filter-container";
import { User } from "better-auth";

type Props = { user?: User };

export default function IndexRender(props: Props) {
  return (
    <ObjektSelectProvider>
      <ObjektTabProvider initialTab="trades">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              FallbackComponent={ErrorFallbackRender}
            >
              <IndexView {...props} />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektTabProvider>
    </ObjektSelectProvider>
  );
}

function IndexView(props: Props) {
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const { data: objekts } = useSuspenseQuery(collectionOptions);

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
                      enableSelect={props.user !== undefined}
                    >
                      {({ isSelected, open, select }) => (
                        <ObjektView
                          objekts={item.item}
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
  }, [deferredObjektsFiltered, columns, props.user]);

  useEffect(() => {
    const shaped = shapeObjekts(filters, objekts, artists);
    const allObjekts = shaped.flatMap(([, objekts]) => objekts);
    setCount(allObjekts.length);
    setObjektsFiltered(shaped);
  }, [filters, objekts, artists]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <FilterContainer>
          <Filters {...props} />
        </FilterContainer>
        <FilterSheet>
          <Filters {...props} />
        </FilterSheet>
      </div>
      <span className="font-semibold">{count} total</span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}

function Filters(props: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Filter />
      {props.user !== undefined && <SelectMode state="add" />}
    </div>
  );
}
