import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui/toggle";

export default function CombineDuplicateFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.grouped ?? false}
      onChange={(v) =>
        setFilters({
          grouped: v === false ? null : true,
        })
      }
    >
      Combine duplicate
    </Toggle>
  );
}
