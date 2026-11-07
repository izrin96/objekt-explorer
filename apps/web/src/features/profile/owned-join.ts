import type { OwnedCopy } from "@repo/api/schemas/objekts";
import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";

/**
 * Owned copies joined to their collections by slug, as the full owned rows were built: the
 * collection first, then the copy's own fields, so `id` is the token id. `missing` names the
 * slugs the catalogue doesn't hold yet, a collection made after it was fetched.
 */
export function joinOwned<C extends ValidObjekt>(
  copies: readonly OwnedCopy[],
  catalogue: readonly C[],
): { objekts: (C & OwnedObjekt)[]; missing: string[] } {
  const bySlug = new Map(catalogue.map((collection) => [collection.slug, collection]));
  const objekts: (C & OwnedObjekt)[] = [];
  const missing = new Set<string>();
  for (const copy of copies) {
    const collection = bySlug.get(copy.slug);
    if (!collection) {
      missing.add(copy.slug);
      continue;
    }
    objekts.push(
      Object.assign({}, collection, {
        id: copy.id,
        tokenId: copy.id,
        serial: copy.serial,
        receivedAt: copy.receivedAt,
        mintedAt: copy.mintedAt,
        transferable: copy.transferable,
      }),
    );
  }
  return { objekts, missing: [...missing] };
}
