import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui/toggle";

export default function MissingFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={(filters.unowned ?? false) || (filters.missing ?? false)}
      onChange={(v) =>
        setFilters({
          unowned: null,
          missing: v === false ? null : true,
        })
      }
    >
      Show missing
    </Toggle>
  );
}
