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
import { Button } from "../ui";
import { IconX } from "justd-icons";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  isProfile?: boolean;
};

export default function FilterRender({ isProfile, artists }: Props) {
  const isDesktop = useMediaQuery("(min-width: 640px)", {
    initializeWithValue: false,
  });

  const [filters, setFilters] = useFilters();

  function resetFilters() {
    setFilters({
      member: null,
      artist: null,
      sort: null,
      class: null,
      season: null,
      on_offline: null,
      transferable: null,
      search: null,
      grouped: null,
      column: null,
      group_by: null,
      group_bys: null,
      sort_dir: null,
      group_dir: null,
      unowned: null,
    });
  }

  return (
    <div className="flex gap-2 flex-wrap mb-2">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      {isProfile && <FilterTransferable />}
      <FilterSeason />
      <FilterClass />
      <FilterOnline />
      <FilterSort isProfile={isProfile} />
      <SortDirectionFilter />
      {isProfile && <CombineDuplicateFilter />}
      <FilterSearch />
      <FilterGroupBy />
      {filters.group_by && <GroupDirectionFilter />}
      {isDesktop && <ColumnFilter />}
      {isProfile && <UnownedFilter />}
      <Button appearance="outline" onPress={() => resetFilters()}>
        <IconX />
        Reset filter
      </Button>
    </div>
  );
}
