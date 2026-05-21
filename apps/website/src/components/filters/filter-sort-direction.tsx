import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react/dist/ssr";

import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Toggle } from "../intentui/toggle";

export default function SortDirectionFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="w-fit"
      data-no-border
      isSelected={filters.sort_dir === "asc"}
      onChange={(v) =>
        setFilters({
          sort_dir: v ? "asc" : null,
        })
      }
    >
      {filters.sort_dir === "asc" ? <SortDescendingIcon /> : <SortAscendingIcon />}
      {filters.sort_dir === "asc" ? m.filter_asc() : m.filter_desc()}
    </Toggle>
  );
}
