import type { OfferPick } from "@/features/offers/pick";

import type { AddedMatches } from "./types";

type Sides<T> = { give: T; get: T };

/** Every pick the open added, by side: the matches and what Add it added go together. */
export function addedKeys(
  added: AddedMatches | undefined,
  nearKeys: Sides<readonly string[]>,
): Sides<ReadonlySet<string>> {
  return {
    give: new Set([...(added?.keys.give ?? []), ...nearKeys.give]),
    get: new Set([...(added?.keys.get ?? []), ...nearKeys.get]),
  };
}

const heldIn = (picks: readonly OfferPick[], keys: readonly string[]) =>
  picks.filter((pick) => keys.includes(pick.key));

/**
 * The matches line, or null when it is not shown: it goes once the sender has taken every added
 * pick out by hand. What Add it added goes with the matches, so a builder that had none still
 * offers Remove.
 */
export function matchesLine(i: {
  added: AddedMatches | undefined;
  nearKeys: Sides<readonly string[]>;
  give: readonly OfferPick[];
  get: readonly OfferPick[];
  removed: Sides<OfferPick[]> | null;
}) {
  const { added, nearKeys, give, get, removed } = i;
  if (added === undefined) return null;
  const keys = addedKeys(added, nearKeys);
  if (keys.give.size + keys.get.size === 0) return null;
  const holdsAdded =
    give.some((pick) => keys.give.has(pick.key)) || get.some((pick) => keys.get.has(pick.key));
  if (removed === null && !holdsAdded) return null;

  // once the sender has taken every match out by hand, the line names only what Add it added
  const matchesKept =
    removed !== null ||
    give.some((pick) => added.keys.give.includes(pick.key)) ||
    get.some((pick) => added.keys.get.includes(pick.key));
  const takenNear = removed
    ? [...heldIn(removed.give, nearKeys.give), ...heldIn(removed.get, nearKeys.get)]
    : [];
  return {
    added: matchesKept ? added : { ...added, keys: { give: [], get: [] } },
    nearPicks: [...heldIn(give, nearKeys.give), ...heldIn(get, nearKeys.get)],
    // what Remove took out: the matches it counts, and the near picks it names
    taken: removed
      ? heldIn(removed.give, added.keys.give).length + heldIn(removed.get, added.keys.get).length
      : null,
    takenNear: takenNear.length > 0 ? takenNear : null,
  };
}
