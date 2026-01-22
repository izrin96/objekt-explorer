"use client";

import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../ui/toggle";

export default function GroupDirectionFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  if (!filters.group_by) return;
  return (
    <Toggle
      intent="outline"
      className="selected:inset-ring-fg/15 w-fit"
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
      {filters.group_dir === "asc" ? t("asc") : t("desc")}
    </Toggle>
  );
}
