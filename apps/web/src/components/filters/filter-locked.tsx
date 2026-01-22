"use client";

import { useTranslations } from "next-intl";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../ui/button";

export default function LockedFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Button
      intent="outline"
      data-selected={filters.locked}
      className="w-fit"
      onClick={() =>
        setFilters((f) => ({
          locked: f.locked === true ? false : f.locked === false ? null : true,
        }))
      }
    >
      {filters.locked === true
        ? t("only_locked")
        : filters.locked === false
          ? t("only_unlocked")
          : t("lock_unlocked")}
    </Button>
  );
}
