"use client";

import { useTranslations } from "next-intl";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../ui/toggle";

export default function CombineDuplicateFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.grouped ?? false}
      onChange={(v) =>
        setFilters({
          grouped: v === false ? null : true,
        })
      }
    >
      {t("combine_dups")}
    </Toggle>
  );
}
