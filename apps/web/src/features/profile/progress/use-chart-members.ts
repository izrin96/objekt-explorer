import { useMemo } from "react";

import { useCosmoArtist } from "@/features/artist/use-cosmo-artist";
import { useMemberColor } from "@/features/filters/member-colors";

import type { ChartMember } from "./shape-progress";

/** The roster the bars are drawn for: the selected artists' own members. */
export function useChartMembers(): ChartMember[] {
  const { selectedArtists } = useCosmoArtist();
  const memberColor = useMemberColor();

  return useMemo(
    () =>
      selectedArtists.flatMap((artist) =>
        artist.artistMembers.map((member) => ({
          name: member.name,
          color: memberColor(member.name),
        })),
      ),
    [selectedArtists, memberColor],
  );
}
