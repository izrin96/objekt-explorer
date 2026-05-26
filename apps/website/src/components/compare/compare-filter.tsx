import type { ValidCustomSort } from "@repo/cosmo/types/common";
import { Suspense } from "react";

import ArtistFilter from "@/components/filters/filter-artist";
import ClassFilter from "@/components/filters/filter-class";
import ColorFilter from "@/components/filters/filter-color";
import ColumnFilter from "@/components/filters/filter-column";
import CombineDuplicateFilter from "@/components/filters/filter-combine-duplicate";
import { FilterContainer } from "@/components/filters/filter-container";
import EditionFilter from "@/components/filters/filter-edition";
import GroupDirectionFilter from "@/components/filters/filter-group-direction";
import GroupByFilter from "@/components/filters/filter-groupby";
import MemberFilter from "@/components/filters/filter-member";
import OnlineFilter from "@/components/filters/filter-online";
import SearchFilter from "@/components/filters/filter-search";
import SeasonFilter from "@/components/filters/filter-season";
import SortFilter from "@/components/filters/filter-sort";
import SortDirectionFilter from "@/components/filters/filter-sort-direction";
import ResetFilter from "@/components/filters/reset-filter";
import { useIsFiltering } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";
import type { PublicList } from "@/lib/universal/list";
import { defaultSortDuplicate, defaultSortDuplicateSerial } from "@/lib/utils";

export default function CompareFilter({ list }: { list: PublicList }) {
  const reset = useResetFilters();
  const isFiltering = useIsFiltering();

  const sortOptions: ValidCustomSort[] =
    list.isProfileBind && !list.hideSerial ? defaultSortDuplicateSerial : defaultSortDuplicate;

  return (
    <FilterContainer>
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Suspense>
              <ArtistFilter />
            </Suspense>
            <Suspense>
              <MemberFilter />
            </Suspense>
            <SeasonFilter />
            <ClassFilter />
            <EditionFilter />
            <OnlineFilter />
            <ColorFilter />
            <SortFilter enabled={sortOptions} />
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
      </div>
    </FilterContainer>
  );
}
