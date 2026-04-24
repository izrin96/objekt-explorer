import { useIntlayer } from "react-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../intentui/toggle";

export default function TransferableFilter() {
  const content = useIntlayer("filter");
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
      {content.transferable.value}
    </Toggle>
  );
}
