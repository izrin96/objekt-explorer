"use client";

import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { Suspense, useCallback } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { ObjektCount } from "@/components/collection/objekt-count";
import { ObjektGridItem } from "@/components/collection/objekt-grid-item";
import { ObjektViewProvider } from "@/components/collection/objekt-view-provider";
import { ObjektVirtualGrid } from "@/components/collection/objekt-virtual-grid";
import ErrorFallbackRender from "@/components/error-boundary";
import ArtistFilter from "@/components/filters/filter-artist";
import ClassFilter from "@/components/filters/filter-class";
import ColorFilter from "@/components/filters/filter-color";
import ColumnFilter from "@/components/filters/filter-column";
import CombineDuplicateFilter from "@/components/filters/filter-combine-duplicate";
import { FilterContainer } from "@/components/filters/filter-container";
import EditionFilter from "@/components/filters/filter-edition";
import GroupDirectionFilter from "@/components/filters/filter-group-direction";
import GroupByFilter from "@/components/filters/filter-groupby";
import MemberFilter from "@/components/filters/filter-member";
import OnlineFilter from "@/components/filters/filter-online";
import SearchFilter from "@/components/filters/filter-search";
import SeasonFilter from "@/components/filters/filter-season";
import SortFilter from "@/components/filters/filter-sort";
import SortDirectionFilter from "@/components/filters/filter-sort-direction";
import ResetFilter from "@/components/filters/reset-filter";
import { Loader } from "@/components/intentui/loader";
import { useCompareObjekts } from "@/hooks/use-compare-objekt";
import { useConfigStore } from "@/hooks/use-config";
import { useIsFiltering } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";
import { useTarget } from "@/hooks/use-target";
import { useSession } from "@/hooks/use-user";
import type { CompareInput } from "@/lib/compare/schemas";
import type { PublicList } from "@/lib/universal/user";
import { defaultSortDuplicate, defaultSortDuplicateSerial } from "@/lib/utils";

interface CompareViewProps {
  input: CompareInput;
}

export default function CompareView({ input }: CompareViewProps) {
  const list = useTarget((a) => a.list)!;

  const isProfileList = list.listType === "profile";

  return (
    <ObjektViewProvider modalTab={isProfileList ? "owned" : "trades"}>
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
  const content = useIntlayer("compare");
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-fg text-sm font-medium">
          {input.mode === "missing"
            ? content.view.showing_missing.value
            : content.view.showing_matches.value}
        </h2>
      </div>
      <div className="text-muted-fg text-xs">
        {content.view.source_label.value}: <span className="text-fg">{input.sourceId}</span> -{" "}
        {content.view.target_label.value}:{" "}
        <span className="text-fg">
          {input.targetType === "list" ? input.targetListId : input.targetProfile}
        </span>
        {` (${input.targetType === "list" ? content.view.type_list.value : content.view.type_profile.value})`}
      </div>
    </div>
  );
}

function CompareFilter({ list }: { list: PublicList }) {
  const reset = useResetFilters();
  const isFiltering = useIsFiltering();

  const sortOptions: ValidCustomSort[] =
    list.listType === "profile" ? defaultSortDuplicateSerial : defaultSortDuplicate;

  return (
    <FilterContainer>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Suspense>
              <ArtistFilter />
            </Suspense>
            <Suspense>
              <MemberFilter />
            </Suspense>
            <SeasonFilter />
            <ClassFilter />
            <EditionFilter />
            <OnlineFilter />
            <ColorFilter />
            <SortFilter enabled={sortOptions} />
            <SortDirectionFilter />
            <CombineDuplicateFilter />
            <GroupByFilter />
            <GroupDirectionFilter />
          </div>
          <div className="flex flex-wrap gap-2">
            <ColumnFilter />
            <SearchFilter />
            <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
          </div>
        </div>
      </div>
    </FilterContainer>
  );
}

function CompareGrid({ input, list }: { input: CompareInput; list: PublicList }) {
  const { data: session } = useSession();
  const hideLabel = useConfigStore((a) => a.hideLabel);
  const { shaped, filtered, filters } = useCompareObjekts(input);
  const isProfileList = list.listType === "profile";

  const renderObjekt = useCallback(
    ({ item }: { item: ValidObjekt[] }) => {
      const objekt = item[0];
      if (!objekt) return null;

      return (
        <ObjektGridItem
          objekts={item}
          session={!!session}
          showSelect={false}
          viewProps={{
            hideLabel,
            showCount: true,
            showSerial: !filters.grouped && isProfileList,
            showOwned: isProfileList,
            listCurrency: list.currency,
          }}
        />
      );
    },
    [session, hideLabel, list.currency, isProfileList, filters.grouped],
  );

  return (
    <>
      <ObjektCount filtered={filtered} />
      <ObjektVirtualGrid shaped={shaped} renderItem={renderObjekt} />
    </>
  );
}
