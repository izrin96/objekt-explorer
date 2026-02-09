"use client";

import { Suspense } from "react";

import ArtistFilter from "@/components/filters/filter-artist";
import FilterClass from "@/components/filters/filter-class";
import ColumnFilter from "@/components/filters/filter-column";
import EditionFilter from "@/components/filters/filter-edition";
import MemberFilter from "@/components/filters/filter-member";
import FilterOnline from "@/components/filters/filter-online";
import FilterSeason from "@/components/filters/filter-season";
import TransferableFilter from "@/components/filters/filter-transferable";
import ResetFilter from "@/components/filters/reset-filter";
import CheckpointPicker from "@/components/profile/checkpoint-picker";
import { useIsFiltering } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";

import GroupBysFilter from "./filter-groupbys";
import ShowCountFilter from "./filter-showcount";

export default function ProgressFilter() {
  const reset = useResetFilters();
  const isFiltering = useIsFiltering();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Suspense>
          <ArtistFilter />
        </Suspense>
        <Suspense>
          <MemberFilter />
        </Suspense>
        <TransferableFilter />
        <FilterSeason />
        <FilterClass hideEtc />
        <EditionFilter />
        <FilterOnline />
        <GroupBysFilter />
        <ColumnFilter />
        <ShowCountFilter />
        <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
      </div>
      <div className="flex justify-center">
        <CheckpointPicker />
      </div>
    </div>
  );
}
