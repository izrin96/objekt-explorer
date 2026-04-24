import { useIntlayer } from "react-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../intentui/toggle";

export default function CombineDuplicateFilter() {
  const content = useIntlayer("filter");
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
      {content.combine_dups.value}
    </Toggle>
  );
}
