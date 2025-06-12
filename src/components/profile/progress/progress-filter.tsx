"use client";

import MemberFilter from "@/components/filters/filter-member";
import FilterSeason from "@/components/filters/filter-season";
import FilterOnline from "@/components/filters/filter-online";
import FilterClass from "@/components/filters/filter-class";
import ArtistFilter from "@/components/filters/filter-artist";
import ResetFilter from "@/components/filters/reset-filter";
import GroupBysFilter from "./filter-groupbys";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import React from "react";
import EditionFilter from "@/components/filters/filter-edition";
import ShowCountFilter from "./filter-showcount";
import { useResetFilters } from "@/hooks/use-reset-filters";
import { checkFiltering, useFilters } from "@/hooks/use-filters";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function ProgressFilter({ artists }: Props) {
  const reset = useResetFilters();
  const [filters] = useFilters();
  const isFiltering = checkFiltering(filters);
  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      <FilterSeason />
      <FilterClass hideZeroWelcome />
      <EditionFilter />
      <FilterOnline />
      <GroupBysFilter />
      <ShowCountFilter />
      <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
    </div>
  );
}
