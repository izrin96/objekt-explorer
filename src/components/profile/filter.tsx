"use client";

import React, { useState } from "react";
import ArtistFilter from "../filters/filter-artist";
import MemberFilter from "../filters/filter-member";
import TransferableFilter from "../filters/filter-transferable";
import SeasonFilter from "../filters/filter-season";
import ClassFilter from "../filters/filter-class";
import EditionFilter from "../filters/filter-edition";
import OnlineFilter from "../filters/filter-online";
import SortFilter from "../filters/filter-sort";
import SortDirectionFilter from "../filters/filter-sort-direction";
import CombineDuplicateFilter from "../filters/filter-combine-duplicate";
import SearchFilter from "../filters/filter-search";
import GroupByFilter from "../filters/filter-groupby";
import GroupDirectionFilter from "../filters/filter-group-direction";
import ColumnFilter from "../filters/filter-column";
import UnownedFilter from "../filters/filter-unowned";
import ResetFilter from "../filters/reset-filter";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import HidePinFilter from "../filters/filter-hide-pin";
import { useResetFilters } from "@/hooks/use-reset-filters";
import ColorFilter from "../filters/filter-color";
import { checkFiltering, useFilters } from "@/hooks/use-filters";
import { Button } from "../ui";
import { GenerateDiscordFormatModal } from "./modal/generate-discord";

export default function Filter() {
  const { artists } = useCosmoArtist();
  const reset = useResetFilters();
  const [filters] = useFilters();
  const isFiltering = checkFiltering(filters);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        <ArtistFilter artists={artists} />
        <MemberFilter artists={artists} />
        <TransferableFilter />
        <SeasonFilter />
        <ClassFilter />
        <EditionFilter />
        <OnlineFilter />
        <ColorFilter />
        <SortFilter allowDuplicateSort allowSerialSort />
        <SortDirectionFilter />
        <CombineDuplicateFilter />
        <GroupByFilter />
        <GroupDirectionFilter />
      </div>
      <div className="flex gap-2 flex-wrap">
        <HidePinFilter />
        <UnownedFilter />
        <ColumnFilter />
        <SearchFilter />
        <GenerateDiscordFormat />
        <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
      </div>
    </div>
  );
}

function GenerateDiscordFormat() {
  const [genOpen, setGenOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />
      <Button intent="outline" onClick={() => setGenOpen(true)}>
        Discord Format
      </Button>
    </>
  );
}
