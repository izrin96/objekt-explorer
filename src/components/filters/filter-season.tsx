"use client";

import { type Selection } from "react-stately";
import { ValidSeason, validSeasons } from "@/lib/universal/cosmo/common";
import { useMemo, useCallback } from "react";
import { Menu, Button } from "../ui";
import { useFilters } from "@/hooks/use-filters";
import { parseSelected } from "@/lib/utils";

export default function SeasonFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.season), [filters.season]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidSeason>(key, true);
      setFilters({
        season: value,
      });
    },
    [setFilters]
  );

  return (
    <Menu respectScreen={false}>
      <Button
        intent="outline"
        className={filters.season?.length ? "!inset-ring-primary" : ""}
      >
        Season
      </Button>
      <Menu.Content
        respectScreen={false}
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
