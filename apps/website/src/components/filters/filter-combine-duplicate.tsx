import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Toggle } from "../intentui/toggle";

export default function CombineDuplicateFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.grouped ?? false}
      onChange={(v) =>
        setFilters({
          grouped: !v ? null : true,
        })
      }
    >
      {m.filter_combine_dups()}
    </Toggle>
  );
}
