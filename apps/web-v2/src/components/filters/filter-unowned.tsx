import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui/toggle";

export default function UnownedFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="selected:inset-ring-primary"
      isSelected={filters.unowned ?? false}
      onChange={(v) =>
        setFilters({
          unowned: v === false ? null : true,
        })
      }
    >
      Show unowned
    </Toggle>
  );
}
