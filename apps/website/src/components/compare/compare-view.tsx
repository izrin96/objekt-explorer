import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ObjektCount } from "@/components/collection/objekt-count";
import { ObjektGrid } from "@/components/collection/objekt-grid";
import { ObjektViewProvider } from "@/components/collection/objekt-view-provider";
import { ObjektVirtualGrid } from "@/components/collection/objekt-virtual-grid";
import { Loader } from "@/components/intentui/loader";
import ErrorFallbackRender from "@/components/router/error-boundary";
import { useCompareObjekts } from "@/hooks/use-compare-objekt";
import { useConfigStore } from "@/hooks/use-config";
import { useListTarget } from "@/hooks/use-list-target";
import type { CompareInput } from "@/lib/universal/compare";
import type { PublicList } from "@/lib/universal/list";
import { m } from "@/paraglide/messages";

import CompareFilter from "./compare-filter";

interface CompareViewProps {
  input: CompareInput;
}

export default function CompareView({ input }: CompareViewProps) {
  const list = useListTarget()!;

  return (
    <ObjektViewProvider modalTab={list.isProfileBind && !list.hideSerial ? "owned" : "trades"}>
      <ListCompareHeader input={input} />

      <div className="flex flex-col gap-4">
        <CompareFilter list={list} />

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
                <CompareGrid input={input} list={list} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </ObjektViewProvider>
  );
}

function ListCompareHeader({ input }: { input: CompareInput }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-fg text-sm font-medium">
          {input.mode === "missing"
            ? m.compare_view_showing_missing()
            : m.compare_view_showing_matches()}
        </h2>
      </div>
      <div className="text-muted-fg text-xs">
        {m.compare_view_source_label()}: <span className="text-fg">{input.sourceId}</span> -{" "}
        {m.compare_view_target_label()}:{" "}
        <span className="text-fg">
          {input.targetType === "list" ? input.targetListId : input.targetProfile}
        </span>
        {` (${input.targetType === "list" ? m.compare_view_type_list() : m.compare_view_type_profile()})`}
      </div>
    </div>
  );
}

function CompareGrid({ input, list }: { input: CompareInput; list: PublicList }) {
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered, filters } = useCompareObjekts(input);

  const renderObjekt = useCallback(
    ({ item, rowIndex }: { item: ValidObjekt[]; rowIndex: number }) => {
      const objekt = item[0];
      if (!objekt) return null;

      return (
        <ObjektGrid.View
          objekts={item}
          hideLabel={hideLabel}
          showCount
          showSerial={!filters.grouped && list.isProfileBind && !list.hideSerial}
          listCurrency={list.currency}
          isPriority={rowIndex < 3}
        />
      );
    },
    [hideLabel, list.currency, list.isProfileBind, filters.grouped],
  );

  return (
    <>
      <ObjektCount filtered={filtered} />
      <ObjektVirtualGrid shaped={shaped} renderItem={renderObjekt} />
    </>
  );
}
