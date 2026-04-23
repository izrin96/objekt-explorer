"use client";

import { useIntlayer } from "next-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../intentui/button";

export default function LockedFilter() {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();
  return (
    <Button
      intent="outline"
      data-selected={filters.locked}
      className="w-fit"
      onPress={() =>
        setFilters((f) => ({
          locked: f.locked === true ? false : f.locked === false ? null : true,
        }))
      }
    >
      {filters.locked === true
        ? content.only_locked.value
        : filters.locked === false
          ? content.only_unlocked.value
          : content.lock_unlocked.value}
    </Button>
  );
}
