import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Toggle } from "../intentui/toggle";

export default function PricedFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.priced ?? false}
      onChange={(selected) => setFilters({ priced: selected ? true : null })}
    >
      {m.filter_priced_only()}
    </Toggle>
  );
}
