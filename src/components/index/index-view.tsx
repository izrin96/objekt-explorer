"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useFilters } from "@/hooks/use-filters";
import { ObjektItem, shapeObjekts } from "@/lib/filter-utils";
import { WindowVirtualizer } from "virtua";
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
import { ObjektModalProvider } from "@/hooks/use-objekt-modal";
import { SelectMode } from "../filters/select-mode";
import { ObjektSelectProvider } from "@/hooks/use-objekt-select";
import { ObjektViewSelectable } from "../objekt/objekt-selectable";
import ObjektView from "../objekt/objekt-view";
import Filter from "./filter";
import { ValidObjekt } from "@/lib/universal/objekts";
import { FilterSheet } from "../filters/filter-sheet";
import { FilterContainer } from "../filters/filter-container";
import { AddToList } from "../list/modal/manage-objekt";
import { Button } from "../ui";
import ObjektModal from "../objekt/objekt-modal";
import { authClient } from "@/lib/auth-client";

export default function IndexRender() {
  return (
    <ObjektSelectProvider>
      <ObjektModalProvider initialTab="trades">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={reset}
              FallbackComponent={ErrorFallbackRender}
            >
              <IndexView />
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </ObjektModalProvider>
    </ObjektSelectProvider>
  );
}

function IndexView() {
  const session = authClient.useSession();
  const authenticated = session.data !== null;
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const { columns } = useBreakpointColumn();
  const [count, setCount] = useState(0);
  const query = useSuspenseQuery(collectionOptions);

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
                <ObjektModal key={objekt.id} objekts={item.item}>
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      objekt={objekt}
                      openObjekts={openObjekts}
                      enableSelect={authenticated}
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
                </ObjektModal>
              );
            }}
          </ObjektsRenderRow>
        ),
      }),
    ]);
  }, [deferredObjektsFiltered, columns, authenticated]);

  useEffect(() => {
    const shaped = shapeObjekts(filters, query.data, artists);
    const allObjekts = shaped.flatMap(([, objekts]) => objekts);
    setCount(allObjekts.length);
    setObjektsFiltered(shaped);
  }, [filters, query.data, artists]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <FilterContainer>
          <Filters authenticated={authenticated} />
        </FilterContainer>
        <FilterSheet>
          <Filters authenticated={authenticated} />
        </FilterSheet>
      </div>
      <span className="font-semibold">{count} total</span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}

function Filters({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <Filter />
      {authenticated && (
        <SelectMode>
          {({ handleAction }) => (
            <AddToList>
              {({ open }) => (
                <Button intent="outline" onClick={() => handleAction(open)}>
                  Add to list
                </Button>
              )}
            </AddToList>
          )}
        </SelectMode>
      )}
    </div>
  );
}
