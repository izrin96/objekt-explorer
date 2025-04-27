"use client";

import MemberFilter from "@/components/filters/filter-member";
import FilterSeason from "@/components/filters/filter-season";
import FilterOnline from "@/components/filters/filter-online";
import FilterClass from "@/components/filters/filter-class";
import ArtistFilter from "@/components/filters/filter-artist";
import ResetFilter from "@/components/filters/reset-filter";
import TypeFilter from "./filter-type";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import React from "react";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function TradesFilter({ artists }: Props) {
  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      <TypeFilter />
      <ArtistFilter artists={artists} />
      <MemberFilter artists={artists} />
      <FilterSeason />
      <FilterClass />
      <FilterOnline />
      <ResetFilter />
    </div>
  );
}
