export type HoldAction = "park" | "record" | "keep-collection";

/**
 * Decides, transfer by transfer, whether a token's transfer is recorded or held. Once a token
 * has a held transfer every later one is held too, so the replay sees its mint first. A known
 * objekt never changes collection, so a failed fetch keeps the one it has.
 */
export function createHold(heldTokens: Iterable<string>) {
  const held = new Set(heldTokens);

  return function decide(
    tokenId: string,
    { known, resolved }: { known: boolean; resolved: boolean },
  ): HoldAction {
    if (held.has(tokenId) || (!known && !resolved)) {
      held.add(tokenId);
      return "park";
    }
    return resolved ? "record" : "keep-collection";
  };
}
