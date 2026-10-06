import { skipToken, useQuery } from "@tanstack/react-query";

import { findProfile } from "@/features/compare/profile-target";
import { isComparing } from "@/features/compare/search-schema";
import { useCompareSearch } from "@/features/compare/use-compare";
import { useUserProfiles } from "@/features/user/hooks";
import { orpc } from "@/lib/orpc";

const toSlugSet = (data: { slugs: string[] }) => new Set(data.slugs);

/**
 * The market compares only the viewer's own profiles, and only for what they
 * are missing. Anything else in the URL is ignored, including a link to a
 * profile the viewer does not own.
 */
export function useMarketCompare() {
  const search = useCompareSearch();
  const profiles = useUserProfiles();

  const requested =
    isComparing(search) && search.cmp_type === "profile" && search.cmp_mode === "missing"
      ? search
      : null;
  const profile = requested ? findProfile(profiles, requested.cmp_to) : undefined;

  const heldQuery = useQuery(
    orpc.compare.heldSlugs.queryOptions({
      input: profile ? { address: profile.address } : skipToken,
      select: toSlugSet,
      staleTime: 0,
      retry: false,
    }),
  );

  return {
    compare: profile ? requested : null,
    activeAddress: profile?.address,
    ownedSlugs: heldQuery.data,
    isPending: profile !== undefined && heldQuery.isPending,
    error: heldQuery.error?.message,
  };
}
