import { truncateAddress } from "@repo/lib/address";

import type { NearOpen, NearVerb } from "@/features/trade/near";

export function isTradeRole(listType: string): listType is "have" | "want" | "sale" {
  return listType === "have" || listType === "want" || listType === "sale";
}

type NearMatches = {
  slugs: ReadonlySet<string>;
  listIdsOf: Readonly<Record<string, readonly number[] | undefined>>;
  side: { verb: NearVerb };
};

type NearList = {
  listType: string;
  name: string;
  user?: { name?: string | null } | null;
  profileAddress?: string | null;
};

// a near card's drawer says why it isn't counted, as a Trade strip's does; a near collection
// is never a match, so the only card that opens one is in the near section
export function activeNearOf(
  objekt: { slug: string } | null,
  near: NearMatches | null,
  list: NearList,
): NearOpen | null {
  if (!objekt || !near?.slugs.has(objekt.slug) || !isTradeRole(list.listType)) return null;
  return {
    verb: near.side.verb,
    role: list.listType,
    theirList: list.name,
    myListIds: near.listIdsOf[objekt.slug] ?? [],
    // as Trade names a person with no name: by the profile's address
    person:
      list.user?.name ?? (list.profileAddress ? truncateAddress(list.profileAddress) : undefined),
  };
}
