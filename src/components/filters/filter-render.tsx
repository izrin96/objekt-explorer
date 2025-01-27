"use client";

import { useFilters } from "@/hooks/use-filters";
import FilterSeason from "./filter-season";
import FilterSort from "./filter-sort";
import FilterTransferable from "./filter-transferable";
import FilterOnline from "./filter-online";
import FilterClass from "./filter-class";
import FilterSearch from "./filter-search";
import { Toggle } from "../ui";
import MemberFilter from "./filter-member";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import ArtistFilter from "./filter-artist";
import ColumnFilter from "./filter-column";
import { useMediaQuery } from "usehooks-ts";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
  isOwned?: boolean;
};

export default function FilterRender({ isOwned, artists }: Props) {
  const isDesktop = useMediaQuery("(min-width: 640px)", {
    initializeWithValue: false,
  });
  const [filters, setFilters] = useFilters();

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      {isOwned && <FilterTransferable />}
      <FilterSeason />
      <FilterOnline />
      <FilterClass />
      <FilterSort isOwned={isOwned} />
      <FilterSearch />
      {isOwned && (
        <Toggle
          className="data-selected:inset-ring-primary"
          appearance="outline"
          size="medium"
          isSelected={filters.grouped ?? false}
          onChange={(v) =>
            setFilters({
              grouped: v ? true : null,
            })
          }
        >
          Combine duplicate
        </Toggle>
      )}
      {isDesktop && <ColumnFilter />}
    </div>
  );
}
