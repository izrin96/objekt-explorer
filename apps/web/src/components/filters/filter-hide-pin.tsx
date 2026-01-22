"use client";

import { useTranslations } from "next-intl";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../ui/toggle";

export default function HidePinFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.hidePin ?? false}
      onChange={(v) =>
        setFilters({
          hidePin: !v ? null : true,
        })
      }
    >
      {t("disable_pin")}
    </Toggle>
  );
}
