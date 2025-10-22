import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react/dist/ssr";
import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui/toggle";

export default function GroupDirectionFilter() {
  const [filters, setFilters] = useFilters();
  if (!filters.group_by) return;
  return (
    <Toggle
      intent="outline"
      className="w-fit"
      isSelected={filters.group_dir === "asc"}
      onChange={(v) =>
        setFilters({
          group_dir: v ? "asc" : null,
        })
      }
    >
      {filters.group_dir === "asc" ? (
        <SortDescendingIcon data-slot="icon" />
      ) : (
        <SortAscendingIcon data-slot="icon" />
      )}
      {filters.group_dir === "asc" ? "Ascending" : "Descending"}
    </Toggle>
  );
}
