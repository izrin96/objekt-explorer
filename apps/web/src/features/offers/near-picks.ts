import type { TopupPayer } from "@repo/api/schemas/offer";
import type { NearVerb } from "@repo/api/schemas/trade";

import type { OfferPick, OfferSide } from "./pick";
import { countOf, totalOf } from "./quantity";

/** Near matches the builder offers to add: one side and verb, picked as matches are. */
export type NearGroup = { side: OfferSide; verb: NearVerb; picks: OfferPick[] };

/** Who a near sale or buy's top-up is paid by: they buy what the viewer sells, the viewer buys what they sell. */
export function nearPayer(verb: NearVerb): TopupPayer | null {
  if (verb === "sell") return "to";
  if (verb === "buy") return "from";
  return null;
}

/**
 * `picks` with the group's added after them, skipping any already held and any past the side's
 * `limit`; `added` is what went in, so only those count as Add it's.
 */
export function withNear(picks: readonly OfferPick[], group: NearGroup, limit: number) {
  const held = new Set(picks.map((pick) => pick.key));
  let room = limit - totalOf(picks);
  const added: OfferPick[] = [];
  for (const pick of group.picks) {
    if (held.has(pick.key) || countOf(pick) > room) continue;
    added.push(pick);
    room -= countOf(pick);
  }
  return { picks: [...picks, ...added], added };
}

/**
 * Make offer with it: the group holding `slug` gives up that one pick, added at open; the rest
 * of its group, and every other group, still wait on their lines.
 */
export function takeNear(groups: readonly NearGroup[], slug: string | undefined) {
  const at =
    slug === undefined
      ? -1
      : groups.findIndex((g) => g.picks.some((p) => p.collectionSlug === slug));
  const group = groups[at];
  if (!group) return { taken: null, left: [...groups] };
  const pick = group.picks.find((p) => p.collectionSlug === slug)!;
  const rest = group.picks.filter((p) => p !== pick);
  const left = groups.flatMap((g, i) =>
    i !== at ? [g] : rest.length > 0 ? [{ ...g, picks: rest }] : [],
  );
  return { taken: { side: group.side, verb: group.verb, pick }, left };
}
