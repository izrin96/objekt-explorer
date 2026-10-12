import { matchCounts, viewerListIds } from "../../lib/trade-person";
import type { MatchCounts } from "../../schemas/trade";
import { recountPartners, resolveTradeSides } from "./index";

/**
 * Each owner's counts against the viewer's lists, by For you's rules, for the owners on one
 * Browse page. An owner who matches nothing is left out.
 */
export type PersonMatch = { counts: MatchCounts; haveListIds: number[]; wantListIds: number[] };

export async function personMatches(
  viewerId: string,
  ownerIds: string[],
): Promise<Map<string, PersonMatch>> {
  const sides = await resolveTradeSides(viewerId, undefined, "all");
  if (sides.haveListIds.length === 0 && sides.wantListIds.length === 0)
    return new Map<string, PersonMatch>();
  const { recounted } = await recountPartners(viewerId, sides, "all", ownerIds);
  return new Map(
    recounted.flatMap((partner) => {
      const counts = matchCounts(partner);
      if (counts.theyHave === 0 && counts.youHave === 0) return [];
      return [[partner.userId, { counts, ...viewerListIds(partner) }] as const];
    }),
  );
}
