"use client";

import { type Selection } from "@react-types/shared";
import { ValidSeason, validSeasons } from "@/lib/universal/cosmo/common";
import { useMemo, useCallback, memo } from "react";
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
        appearance="outline"
        className={
          filters.season?.length
            ? "data-pressed:border-primary data-hovered:border-primary border-primary"
            : ""
        }
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
          <Menu.Checkbox id={item.value} textValue={item.value}>
            {item.value}
          </Menu.Checkbox>
        )}
      </Menu.Content>
    </Menu>
  );
}
