"use client";

import MemberFilter from "@/components/filters/filter-member";
import FilterSeason from "@/components/filters/filter-season";
import FilterOnline from "@/components/filters/filter-online";
import FilterClass from "@/components/filters/filter-class";
import ArtistFilter from "@/components/filters/filter-artist";
import ResetFilter from "@/components/filters/reset-filter";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import React from "react";
import EditionFilter from "@/components/filters/filter-edition";
import { useResetFilters } from "@/hooks/use-reset-filters";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function StatsFilter({ artists }: Props) {
  const reset = useResetFilters();
  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      <FilterSeason />
      <FilterClass hideZeroWelcome />
      <EditionFilter />
      <FilterOnline />
      <ResetFilter onReset={() => reset()} />
    </div>
  );
}
