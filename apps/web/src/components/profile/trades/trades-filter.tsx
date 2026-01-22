"use client";

import { Suspense } from "react";

import ArtistFilter from "@/components/filters/filter-artist";
import FilterClass from "@/components/filters/filter-class";
import CollectionFilter from "@/components/filters/filter-collection";
import MemberFilter from "@/components/filters/filter-member";
import FilterOnline from "@/components/filters/filter-online";
import FilterSeason from "@/components/filters/filter-season";
import ResetFilter from "@/components/filters/reset-filter";
import { useIsFiltering } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";

import TypeFilter, { useTypeFilter } from "./filter-type";

export default function TradesFilter() {
  const reset = useResetFilters();
  const [type, setType] = useTypeFilter();
  const isFiltering = useIsFiltering();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <TypeFilter />
      <ArtistFilter />
      <MemberFilter />
      <FilterSeason />
      <FilterClass />
      <FilterOnline />
      <Suspense>
        <CollectionFilter />
      </Suspense>
      <ResetFilter
        isDisabled={!(isFiltering || type !== null)}
        onReset={async () => {
          await reset();
          return setType(null);
        }}
      />
    </div>
  );
}
