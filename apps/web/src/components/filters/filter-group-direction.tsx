"use client";

import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../intentui/toggle";

export default function GroupDirectionFilter() {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();
  if (!filters.group_by) return null;
  return (
    <Toggle
      intent="outline"
      className="w-fit"
      data-no-border
      isSelected={filters.group_dir === "asc"}
      onChange={(v) =>
        setFilters({
          group_dir: v ? "asc" : null,
        })
      }
    >
      {filters.group_dir === "asc" ? (
        <SortDescendingIcon data-slot="icon" />
      ) : (
        <SortAscendingIcon data-slot="icon" />
      )}
      {filters.group_dir === "asc" ? content.asc.value : content.desc.value}
    </Toggle>
  );
}
