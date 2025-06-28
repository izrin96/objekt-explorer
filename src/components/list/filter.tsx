"use client";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { checkFiltering, useFilters } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";
import ArtistFilter from "../filters/filter-artist";
import ClassFilter from "../filters/filter-class";
import ColorFilter from "../filters/filter-color";
import ColumnFilter from "../filters/filter-column";
import CombineDuplicateFilter from "../filters/filter-combine-duplicate";
import EditionFilter from "../filters/filter-edition";
import GroupDirectionFilter from "../filters/filter-group-direction";
import GroupByFilter from "../filters/filter-groupby";
import MemberFilter from "../filters/filter-member";
import OnlineFilter from "../filters/filter-online";
import SearchFilter from "../filters/filter-search";
import SeasonFilter from "../filters/filter-season";
import SortFilter from "../filters/filter-sort";
import SortDirectionFilter from "../filters/filter-sort-direction";
import ResetFilter from "../filters/reset-filter";

export default function Filter() {
  const { artists } = useCosmoArtist();
  const reset = useResetFilters();
  const [filters] = useFilters();
  const isFiltering = checkFiltering(filters);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <ArtistFilter artists={artists} />
        <MemberFilter artists={artists} />
        <SeasonFilter />
        <ClassFilter />
        <EditionFilter />
        <OnlineFilter />
        <ColorFilter />
        <SortFilter allowDuplicateSort />
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
  );
}
