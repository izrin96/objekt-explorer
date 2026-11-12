import { skipToken, useQuery } from "@tanstack/react-query";

import { findProfile } from "@/features/compare/profile-target";
import { isComparing } from "@/features/compare/search-schema";
import { useCompareSearch } from "@/features/compare/use-compare";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";

const toSlugSet = (data: { slugs: string[] }) => new Set(data.slugs);

/**
 * The market compares only the viewer's own profiles, for what they are
 * missing, and their own lists, for what is on them. Anything else in the URL
 * is ignored, including a link to a profile or list the viewer does not own.
 */
export function useMarketCompare() {
  const search = useCompareSearch();
  const profiles = useUserProfiles();
  const lists = useUserLists();

  const requested = isComparing(search) ? search : null;
  const profile =
    requested?.cmp_type === "profile" && requested.cmp_mode === "missing"
      ? findProfile(profiles, requested.cmp_to)
      : undefined;
  const list =
    requested?.cmp_type === "list" && requested.cmp_mode === "matches"
      ? lists.find((owned) => owned.slug === requested.cmp_to)
      : undefined;

  const heldQuery = useQuery(
    orpc.compare.heldSlugs.queryOptions({
      input: profile ? { address: profile.address } : skipToken,
      select: toSlugSet,
      staleTime: 0,
      retry: false,
    }),
  );
  const listQuery = useQuery(
    orpc.compare.listSlugs.queryOptions({
      input: list ? { slug: list.slug } : skipToken,
      select: toSlugSet,
      staleTime: 0,
      retry: false,
    }),
  );
  const error = heldQuery.error ?? listQuery.error;

  return {
    compare: profile || list ? requested : null,
    activeAddress: profile?.address,
    activeList: list?.slug,
    targetName: list?.name,
    ownedSlugs: heldQuery.data,
    onlySlugs: listQuery.data,
    isPending:
      (profile !== undefined && heldQuery.isPending) || (list !== undefined && listQuery.isPending),
    error: error ? refusalText(error) : undefined,
  };
}
