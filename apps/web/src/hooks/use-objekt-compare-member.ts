import { useCallback } from "react";

import { useCosmoArtist } from "./use-cosmo-artist";

export function useCompareMember() {
  const { getMember } = useCosmoArtist();
  return useCallback(
    (memberA: string, memberB: string) => {
      const memberOrderA = getMember(memberA)?.order ?? Infinity;
      const memberOrderB = getMember(memberB)?.order ?? Infinity;
      return memberOrderA - memberOrderB;
    },
    [getMember],
  );
}
