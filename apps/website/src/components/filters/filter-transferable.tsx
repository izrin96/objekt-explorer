import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Toggle } from "../intentui/toggle";

export default function TransferableFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.transferable ?? false}
      onChange={(v) =>
        setFilters({
          transferable: !v ? null : true,
        })
      }
    >
      {m.filter_transferable()}
    </Toggle>
  );
}
