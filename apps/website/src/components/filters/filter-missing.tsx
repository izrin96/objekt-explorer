import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Toggle } from "../intentui/toggle";

export default function MissingFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={(filters.unowned ?? false) || (filters.missing ?? false)}
      onChange={(v) =>
        setFilters({
          unowned: null,
          missing: !v ? null : true,
        })
      }
    >
      {m.filter_show_missing()}
    </Toggle>
  );
}
