const WORDS = ["anchors", "untransferable", "transferable"] as const;

/**
 * Parses `COSMO_OBJEKT_WRITES`, a comma list of the indexer writes the owner turned on.
 * Unset or empty turns none on; an unknown word is returned so the caller can warn once.
 */
export function objektWriteModes(raw: string | undefined) {
  const words = (raw ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  const known = new Set<string>(WORDS);
  return {
    anchors: words.includes("anchors"),
    untransferable: words.includes("untransferable"),
    transferable: words.includes("transferable"),
    unknown: words.filter((w) => !known.has(w)),
  };
}
export type ObjektWriteModes = ReturnType<typeof objektWriteModes>;
