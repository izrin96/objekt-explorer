"use client";

import React from "react";
import ArtistFilter from "../filters/filter-artist";
import MemberFilter from "../filters/filter-member";
import SeasonFilter from "../filters/filter-season";
import ClassFilter from "../filters/filter-class";
import EditionFilter from "../filters/filter-edition";
import OnlineFilter from "../filters/filter-online";
import SortFilter from "../filters/filter-sort";
import SortDirectionFilter from "../filters/filter-sort-direction";
import CombineDuplicateFilter from "../filters/filter-combine-duplicate";
import SearchFilter from "../filters/filter-search";
import GroupByFilter from "../filters/filter-groupby";
import GroupDirectionFilter from "../filters/filter-group-direction";
import ColumnFilter from "../filters/filter-column";
import ResetFilter from "../filters/reset-filter";
import { useFilters } from "@/hooks/use-filters";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useResetFilters } from "@/hooks/use-reset-filters";

export default function Filter() {
  const { artists } = useCosmoArtist();
  const [filters] = useFilters();
  const reset = useResetFilters();
  return (
    <div className="flex gap-2 flex-wrap">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      <SeasonFilter />
      <ClassFilter />
      <EditionFilter />
      <OnlineFilter />
      <SortFilter allowDuplicateSort />
      <SortDirectionFilter />
      <CombineDuplicateFilter />
      <SearchFilter />
      <GroupByFilter />
      {filters.group_by && <GroupDirectionFilter />}
      <ColumnFilter />
      <ResetFilter onReset={() => reset()} />
    </div>
  );
}
