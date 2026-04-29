import { Suspense } from "react";

import { useIsFiltering } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";

import ArtistFilter from "../filters/filter-artist";
import ClassFilter from "../filters/filter-class";
import CollectionFilter from "../filters/filter-collection";
import ColumnFilter from "../filters/filter-column";
import MemberFilter from "../filters/filter-member";
import OnlineFilter from "../filters/filter-online";
import SeasonFilter from "../filters/filter-season";
import SortFilter from "../filters/filter-sort";
import SortDirectionFilter from "../filters/filter-sort-direction";
import ResetFilter from "../filters/reset-filter";

export default function FilterServer() {
  const reset = useResetFilters();
  const isFiltering = useIsFiltering();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Suspense>
          <ArtistFilter />
        </Suspense>
        <Suspense>
          <MemberFilter />
        </Suspense>
        {/* <TransferableFilter /> */}
        <SeasonFilter />
        <ClassFilter />
        <OnlineFilter />
        <Suspense>
          <CollectionFilter />
        </Suspense>
        <SortFilter enabled={["date", "serial"]} />
        <SortDirectionFilter />
      </div>
      <div className="flex flex-wrap gap-2">
        <ColumnFilter />
        <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
      </div>
    </div>
  );
}
