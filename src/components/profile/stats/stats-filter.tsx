"use client";

import ArtistFilter from "@/components/filters/filter-artist";
import FilterClass from "@/components/filters/filter-class";
import EditionFilter from "@/components/filters/filter-edition";
import MemberFilter from "@/components/filters/filter-member";
import FilterOnline from "@/components/filters/filter-online";
import FilterSeason from "@/components/filters/filter-season";
import ResetFilter from "@/components/filters/reset-filter";
import { checkFiltering, useFilters } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function StatsFilter({ artists }: Props) {
  const reset = useResetFilters();
  const [filters] = useFilters();
  const isFiltering = checkFiltering(filters);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      <FilterSeason />
      <FilterClass hideZeroWelcome />
      <EditionFilter />
      <FilterOnline />
      <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
    </div>
  );
}
