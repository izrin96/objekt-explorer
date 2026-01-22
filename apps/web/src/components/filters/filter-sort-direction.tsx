"use client";

import { SortAscendingIcon, SortDescendingIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../ui/toggle";

export default function SortDirectionFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="selected:inset-ring-fg/15 w-fit"
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
      {filters.sort_dir === "asc" ? t("asc") : t("desc")}
    </Toggle>
  );
}
