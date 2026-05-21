import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react/dist/ssr";

import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Toggle } from "../intentui/toggle";

export default function GroupDirectionFilter() {
  const [filters, setFilters] = useFilters();
  if (!filters.group_by) return null;
  return (
    <Toggle
      intent="outline"
      className="w-fit"
      data-no-border
      isSelected={filters.group_dir === "asc"}
      onChange={(v) =>
        setFilters({
          group_dir: v ? "asc" : null,
        })
      }
    >
      {filters.group_dir === "asc" ? <SortDescendingIcon /> : <SortAscendingIcon />}
      {filters.group_dir === "asc" ? m.filter_asc() : m.filter_desc()}
    </Toggle>
  );
}
