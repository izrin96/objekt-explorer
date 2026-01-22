"use client";

import { useTranslations } from "next-intl";

import { useFilters } from "@/hooks/use-filters";

import { Toggle } from "../ui/toggle";

export default function TransferableFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Toggle
      intent="outline"
      isSelected={filters.transferable ?? false}
      onChange={(v) =>
        setFilters({
          transferable: v === false ? null : true,
        })
      }
    >
      {t("transferable")}
    </Toggle>
  );
}
