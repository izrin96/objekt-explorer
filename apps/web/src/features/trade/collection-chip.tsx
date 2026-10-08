import { ActiveChips } from "@/features/filters/active-chips";
import { m } from "@/paraglide/messages";

import type { BrowseSearch } from "./browse-search";

/** The collection a drawer link landed on. A post's list spans artists and seasons, so Browse has no facets. */
export function CollectionChip({
  search,
  slugName,
  onClearSlug,
}: {
  search: BrowseSearch;
  slugName: string | undefined;
  onClearSlug: () => void;
}) {
  if (!search.slug || !slugName) return null;
  return (
    <ActiveChips
      chips={[
        {
          key: "slug",
          label: `${m.trade_collection_chip()}: ${slugName}`,
          name: m.trade_collection_chip(),
          value: slugName,
          mono: slugName === search.slug,
          remove: {},
        },
      ]}
      onRemove={onClearSlug}
    />
  );
}
