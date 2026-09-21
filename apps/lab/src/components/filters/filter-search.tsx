import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import { useFilters } from "@/components/filters/filter-store";
import { Input } from "@/components/ui/input";

/**
 * The toolbar's search field, shared by `FilterBar` and `ProfileToolbar` so
 * the two cannot drift apart.
 *
 * The padding is the part worth keeping in one place: `className` lands on
 * cnippet `Input`'s bordered wrapper, not on the `<input>`, and the inner
 * element keeps its own 9px — so `pl-6!` puts the placeholder at 24 + 1 + 9,
 * i.e. 8px past the absolutely positioned glyph. A value that looks like it
 * should clear the icon (`pl-8!`) lands 16px past it instead.
 */
export function FilterSearch() {
  const search = useFilters((s) => s.search);
  const set = useFilters((s) => s.set);

  return (
    <div className="relative min-w-55 flex-1 md:flex-none">
      <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        size="sm"
        type="search"
        aria-label="Search"
        placeholder="Search member, Z-code, serial…"
        value={search}
        onChange={(e) => set({ search: e.target.value })}
        className="pl-6! text-[13px]"
      />
    </div>
  );
}
