"use client";

import MemberFilter from "@/components/filters/filter-member";
import FilterSeason from "@/components/filters/filter-season";
import FilterOnline from "@/components/filters/filter-online";
import FilterClass from "@/components/filters/filter-class";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import React from "react";
import ProgressGroupByFilter from "./filter-groupby";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function ProgressFilter({ artists }: Props) {
  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      <MemberFilter artists={artists} />
      <FilterSeason />
      <FilterClass hideZeroWelcome />
      <FilterOnline />
      <ProgressGroupByFilter />
    </div>
  );
}
