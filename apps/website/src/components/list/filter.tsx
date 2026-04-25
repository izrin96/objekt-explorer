import type { ValidCustomSort } from "@repo/cosmo/types/common";
import { Suspense } from "react";

import { useIsFiltering } from "@/hooks/use-filters";
import { useListTarget } from "@/hooks/use-list-target";
import { useResetFilters } from "@/hooks/use-reset-filters";
import { defaultSortDuplicate, defaultSortDuplicateSerial } from "@/lib/utils";

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

export default function Filter({
  discordRef,
}: {
  discordRef: (el: HTMLDivElement | null) => void;
}) {
  const reset = useResetFilters();
  const isFiltering = useIsFiltering();
  const list = useListTarget();

  const sortOptions: ValidCustomSort[] =
    list.listType === "profile" ? defaultSortDuplicateSerial : defaultSortDuplicate;

  return (
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
        <div className="contents" ref={discordRef} />
        <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
      </div>
    </div>
  );
}
