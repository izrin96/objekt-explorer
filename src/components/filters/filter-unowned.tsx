"use client";

import { useTranslations } from "next-intl";
import { useFilters } from "@/hooks/use-filters";
import { Toggle } from "../ui";

export default function UnownedFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      className="data-selected:inset-ring-primary"
      isSelected={filters.unowned ?? false}
      onChange={(v) =>
        setFilters({
          unowned: v === false ? null : true,
        })
      }
    >
      {t("show_unowned")}
    </Toggle>
  );
}
