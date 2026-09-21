import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { m } from "@/paraglide/messages";

import { useFilters, useSetFilters } from "./use-filters";

/**
 * The field holds its own text and commits on a debounce: every commit is a
 * navigation that re-filters the whole catalogue.
 *
 * `className` lands on the kit `Input`'s bordered wrapper, not on the
 * `<input>`, which keeps its own 9px — so `pl-6!` puts the placeholder 8px past
 * the glyph where `pl-8!` lands 16px past it.
 */
export function FilterSearch() {
  const search = useFilters((f) => f.search);
  const setFilters = useSetFilters();
  const [draft, setDraft] = useState(search ?? "");
  const [committed, setCommitted] = useState(search);

  // a Reset or a pasted link changes the committed value under the field
  if (search !== committed) {
    setCommitted(search);
    setDraft(search ?? "");
  }

  const commit = useDebouncedCallback(
    (value: string) => setFilters({ search: value.length > 0 ? value : undefined }),
    250,
  );

  return (
    <div className="relative min-w-55 flex-1 md:flex-none">
      <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        size="sm"
        type="search"
        aria-label={m.common_search_aria()}
        placeholder={m.filter_search_placeholder()}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          commit(event.target.value);
        }}
        className="pl-6! text-[13px]"
      />
    </div>
  );
}
