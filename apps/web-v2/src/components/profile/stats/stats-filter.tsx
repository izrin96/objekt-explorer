import ArtistFilter from "@/components/filters/filter-artist";
import FilterClass from "@/components/filters/filter-class";
import EditionFilter from "@/components/filters/filter-edition";
import MemberFilter from "@/components/filters/filter-member";
import FilterOnline from "@/components/filters/filter-online";
import FilterSeason from "@/components/filters/filter-season";
import ResetFilter from "@/components/filters/reset-filter";
import { useIsFiltering } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";

export default function StatsFilter() {
  const reset = useResetFilters();
  const isFiltering = useIsFiltering();
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <ArtistFilter />
      <MemberFilter />
      <FilterSeason />
      <FilterClass />
      <EditionFilter />
      <FilterOnline />
      <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
    </div>
  );
}
