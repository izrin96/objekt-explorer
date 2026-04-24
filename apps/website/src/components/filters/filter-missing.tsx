import { useIntlayer } from "react-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../intentui/toggle";

export default function MissingFilter() {
  const content = useIntlayer("filter");
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
      {content.show_missing.value}
    </Toggle>
  );
}
