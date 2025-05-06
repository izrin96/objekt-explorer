"use client";

import { IndexedObjekt } from "@/lib/universal/objekts";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import FilterView from "../filters/filter-render";
import { useFilters } from "@/hooks/use-filters";
import { shapeIndexedObjekts } from "@/lib/filter-utils";
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
  const [{ collections: objekts }] = api.list.getEntries.useSuspenseQuery(slug);

  const [objektsFiltered, setObjektsFiltered] = useState<
    [string, IndexedObjekt[]][]
  >([]);
  const deferredObjektsFiltered = useDeferredValue(objektsFiltered);

  const virtualList = useMemo(() => {
    return deferredObjektsFiltered.flatMap(([title, objekts]) => [
      !!title && <GroupLabelRender title={title} key={`label-${title}`} />,
      ...ObjektsRender({
        objekts: objekts.map((ob) => [ob]),
        columns,
        children: ({ objekts, rowIndex }) => (
          <ObjektsRenderRow
            key={`${title}-${rowIndex}`}
            columns={columns}
            rowIndex={rowIndex}
            objekts={objekts}
          >
            {({ objekts, index }) => {
              const [objekt] = objekts;
              return (
                <ObjektModalProvider key={objekt.id} objekts={objekts}>
                  {({ openObjekts }) => (
                    <ObjektViewSelectable
                      getId={() => objekt.id}
                      openObjekts={openObjekts}
                      enableSelect={isOwned}
                    >
                      {({ isSelected, open, select }) => (
                        <ObjektView
                          objekts={objekts}
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
  }, [deferredObjektsFiltered, columns, isOwned]);

  const count = useMemo(
    () => deferredObjektsFiltered.flatMap(([, objekts]) => objekts).length,
    [deferredObjektsFiltered]
  );

  useEffect(() => {
    setObjektsFiltered(shapeIndexedObjekts(filters, objekts, artists));
  }, [filters, objekts, artists]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6">
        <FilterView artists={artists} />
        {isOwned && <SelectMode state="remove" slug={slug} />}
      </div>
      <span className="font-semibold">{count} total</span>

      <WindowVirtualizer>{virtualList}</WindowVirtualizer>
    </div>
  );
}
