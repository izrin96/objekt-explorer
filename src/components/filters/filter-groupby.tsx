"use client";

import type { Selection } from "react-aria-components";
import { Button, Menu } from "../ui";
import { useCallback, useMemo } from "react";
import { useFilters } from "@/hooks/use-filters";
import { validGroupBy, ValidGroupBy } from "@/lib/universal/cosmo/common";

const map: Record<ValidGroupBy, string> = {
  artist: "Artist",
  class: "Class",
  collectionNo: "Collection No.",
  member: "Member",
  season: "Season",
  seasonCollectionNo: "Season & Collection No.",
};

export default function GroupByFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(
    () => new Set(filters.group_by ? [filters.group_by] : []),
    [filters.group_by]
  );

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as ValidGroupBy[];
      const newValue = newFilters.length > 0 ? newFilters[0] : null;
      setFilters({
        group_by: newValue,
        group_dir: ["member", "class"].includes(newValue ?? "") ? "asc" : null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.group_by ? "!inset-ring-primary" : ""}
      >
        Group By
      </Button>
      <Menu.Content
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.values(validGroupBy).map((value) => ({ value }))}
        className="min-w-52"
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={map[item.value]}>
            <Menu.Label>{map[item.value]}</Menu.Label>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
