import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "react-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../intentui/toggle";

export default function SortDirectionFilter() {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="w-fit"
      data-no-border
      isSelected={filters.sort_dir === "asc"}
      onChange={(v) =>
        setFilters({
          sort_dir: v ? "asc" : null,
        })
      }
    >
      {filters.sort_dir === "asc" ? (
        <SortDescendingIcon data-slot="icon" />
      ) : (
        <SortAscendingIcon data-slot="icon" />
      )}
      {filters.sort_dir === "asc" ? content.asc.value : content.desc.value}
    </Toggle>
  );
}
