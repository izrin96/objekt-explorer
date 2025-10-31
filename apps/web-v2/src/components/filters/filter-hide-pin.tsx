import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui/toggle";

export default function HidePinFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.hidePin ?? false}
      onChange={(v) =>
        setFilters({
          hidePin: v === false ? null : true,
        })
      }
    >
      Disable pin
    </Toggle>
  );
}
