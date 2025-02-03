"use client";

import FilterSeason from "./filter-season";
import FilterSort from "./filter-sort";
import FilterTransferable from "./filter-transferable";
import FilterOnline from "./filter-online";
import FilterClass from "./filter-class";
import FilterSearch from "./filter-search";
import FilterGroupBy from "./filter-groupby";
import MemberFilter from "./filter-member";
import ArtistFilter from "./filter-artist";
import ColumnFilter from "./filter-column";
import SortDirectionFilter from "./filter-sort-direction";
import CombineDuplicateFilter from "./filter-combine-duplicate";
import GroupDirectionFilter from "./filter-group-direction";
import { useMediaQuery } from "usehooks-ts";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { useFilters } from "@/hooks/use-filters";
import UnownedFilter from "./filter-unowned";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  isProfile?: boolean;
};

export default function FilterRender({ isProfile, artists }: Props) {
  const isDesktop = useMediaQuery("(min-width: 640px)", {
    initializeWithValue: false,
  });

  const [filters] = useFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      {isProfile && <FilterTransferable />}
      <FilterSeason />
      <FilterOnline />
      <FilterClass />
      <FilterSort isProfile={isProfile} />
      <SortDirectionFilter />
      {isProfile && <CombineDuplicateFilter />}
      <FilterSearch />
      <FilterGroupBy />
      {filters.group_by && <GroupDirectionFilter />}
      {isDesktop && <ColumnFilter />}
      {isProfile && <UnownedFilter />}
    </div>
  );
}
