"use client";

import { type Selection } from "@react-types/shared";
import { ValidSeason, validSeasons } from "@/lib/universal/cosmo/common";
import { useMemo, useCallback } from "react";
import { Menu, Button } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function FilterSeason() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.season), [filters.season]);

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as ValidSeason[];
      setFilters({
        season: newFilters.length > 0 ? newFilters : null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.season?.length ? "inset-ring-primary" : ""}
      >
        Season
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.values(validSeasons).map((value) => ({ value }))}
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={item.value}>
            <Menu.Label>{item.value}</Menu.Label>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
