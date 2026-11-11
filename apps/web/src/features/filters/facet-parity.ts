import { useEffect } from "react";

import type { FacetSurface } from "./facet-keys";

/**
 * Dev-only guard against the bug this table exists to prevent: a facet that
 * only ever renders on one of the two surfaces. Each render site declares the
 * keys it hands to `FacetControls`; `useFacetParity` compares the two.
 */
const declared: Partial<Record<FacetSurface, readonly string[]>> = {};

/**
 * `keys` is widened to `string` rather than `FacetKey`: the guard's job is
 * "every control on one surface is on the other", and an extra is exactly the
 * sort of control that would otherwise go missing.
 */
export function useDeclaredFacets(surface: FacetSurface, keys: readonly string[]): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    declared[surface] = keys;
    return () => {
      delete declared[surface];
    };
  }, [surface, keys]);
}

export function useFacetParity(): void {
  // no dep array: parent effects run after every child effect, so this always
  // sees what both surfaces declared on this render
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const inline = declared.inline ?? [];
    const stacked = declared.stacked ?? [];
    const missing = inline.filter((key) => !stacked.includes(key));
    const extra = stacked.filter((key) => !inline.includes(key));
    if (missing.length > 0 || extra.length > 0) {
      console.error(
        `[filters] facet parity broken — mobile is missing [${missing.join(", ")}] and has extra [${extra.join(", ")}]. Render both surfaces from FACETS.`,
      );
    }
  });
}
