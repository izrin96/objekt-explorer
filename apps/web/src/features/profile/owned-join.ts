import type { OwnedCopy } from "@repo/api/schemas/objekts";
import type { OwnedObjekt, ValidObjekt } from "@repo/lib/types/objekt";

type Joined<C> = { objekts: (C & OwnedObjekt)[]; missing: string[] };

const slugMaps = new WeakMap<readonly ValidObjekt[], Map<string, ValidObjekt>>();

/** One map per catalogue array, so each page's join doesn't build it again. */
function bySlugOf<C extends ValidObjekt>(catalogue: readonly C[]) {
  let map = slugMaps.get(catalogue);
  if (!map) {
    map = new Map(catalogue.map((collection) => [collection.slug, collection]));
    slugMaps.set(catalogue, map);
  }
  return map as Map<string, C>;
}

/**
 * Owned copies joined to their collections by slug, as the full owned rows were built: the
 * collection first, then the copy's own fields, so `id` is the token id. `missing` names the
 * slugs the catalogue doesn't hold yet, a collection made after it was fetched.
 */
export function joinOwned<C extends ValidObjekt>(
  copies: readonly OwnedCopy[],
  catalogue: readonly C[],
): Joined<C> {
  const bySlug = bySlugOf(catalogue);
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

const pageJoins = new WeakMap<
  object,
  { catalogue: readonly ValidObjekt[]; joined: Joined<never> }
>();

/**
 * `joinOwned` over every page, each page joined once per catalogue: the infinite query keeps a
 * loaded page's object as later pages arrive, so only the new page is joined again.
 */
export function joinOwnedPages<C extends ValidObjekt>(
  pages: readonly { copies: readonly OwnedCopy[] }[],
  catalogue: readonly C[],
): Joined<C> {
  const objekts: (C & OwnedObjekt)[] = [];
  const missing = new Set<string>();
  for (const page of pages) {
    const cached = pageJoins.get(page);
    let joined: Joined<C>;
    if (cached && cached.catalogue === catalogue) {
      joined = cached.joined as unknown as Joined<C>;
    } else {
      joined = joinOwned(page.copies, catalogue);
      pageJoins.set(page, { catalogue, joined: joined as unknown as Joined<never> });
    }
    for (const objekt of joined.objekts) objekts.push(objekt);
    for (const slug of joined.missing) missing.add(slug);
  }
  return { objekts, missing: [...missing] };
}
