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
  isOwned?: boolean;
};

export default function FilterRender({ isOwned, artists }: Props) {
  const isDesktop = useMediaQuery("(min-width: 640px)", {
    initializeWithValue: false,
  });

  const [filters] = useFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      {isOwned && <FilterTransferable />}
      <FilterSeason />
      <FilterOnline />
      <FilterClass />
      <FilterSort isOwned={isOwned} />
      <SortDirectionFilter />
      {isOwned && <CombineDuplicateFilter />}
      <FilterSearch />
      <FilterGroupBy />
      {filters.group_by && <GroupDirectionFilter />}
      {isDesktop && <ColumnFilter />}
      {isOwned && <UnownedFilter />}
    </div>
  );
}
