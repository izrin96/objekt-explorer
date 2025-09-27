"use client";

import { useState } from "react";
import { useIsFiltering } from "@/hooks/use-filters";
import { useResetFilters } from "@/hooks/use-reset-filters";
import type { ValidObjekt } from "@/lib/universal/objekts";
import ArtistFilter from "../filters/filter-artist";
import ClassFilter from "../filters/filter-class";
import ColorFilter from "../filters/filter-color";
import ColumnFilter from "../filters/filter-column";
import CombineDuplicateFilter from "../filters/filter-combine-duplicate";
import EditionFilter from "../filters/filter-edition";
import GroupDirectionFilter from "../filters/filter-group-direction";
import GroupByFilter from "../filters/filter-groupby";
import HideLabelFilter from "../filters/filter-hide-label";
import HidePinFilter from "../filters/filter-hide-pin";
import LockedFilter from "../filters/filter-locked";
import MemberFilter from "../filters/filter-member";
import OnlineFilter from "../filters/filter-online";
import SearchFilter from "../filters/filter-search";
import SeasonFilter from "../filters/filter-season";
import SortFilter from "../filters/filter-sort";
import SortDirectionFilter from "../filters/filter-sort-direction";
import TransferableFilter from "../filters/filter-transferable";
import UnownedFilter from "../filters/filter-unowned";
import WideFilter from "../filters/filter-wide";
import ResetFilter from "../filters/reset-filter";
import { Button } from "../ui";
import GenerateDiscordFormatModalProfile from "./modal/generate-discord";

export default function Filter({ objekts }: { objekts: ValidObjekt[] }) {
  const reset = useResetFilters();
  const isFiltering = useIsFiltering();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <ArtistFilter />
        <MemberFilter />
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
      <div className="flex flex-wrap gap-2">
        <HidePinFilter />
        <LockedFilter />
        <UnownedFilter />
        <HideLabelFilter />
        <WideFilter />
        <ColumnFilter />
        <SearchFilter />
        <GenerateDiscordFormat objekts={objekts} />
        <ResetFilter onReset={() => reset()} isDisabled={!isFiltering} />
      </div>
    </div>
  );
}

function GenerateDiscordFormat({ objekts }: { objekts: ValidObjekt[] }) {
  const [genOpen, setGenOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModalProfile objekts={objekts} open={genOpen} setOpen={setGenOpen} />
      <Button intent="outline" onClick={() => setGenOpen(true)}>
        Discord format
      </Button>
    </>
  );
}
