"use client";

import type { Selection } from "react-aria-components";
import { Button, Menu } from "@/components/ui";
import { useCallback, useMemo } from "react";
import { useFilters } from "@/hooks/use-filters";
import { ValidGroupBy } from "@/lib/universal/cosmo/common";

const map: Record<string, string> = {
  artist: "Artist",
  member: "Member",
  season: "Season",
  class: "Class",
};

export default function GroupBysFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(
    () => new Set(filters.group_bys ?? []),
    [filters.group_bys]
  );

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as ValidGroupBy[];
      const newValue = newFilters.length > 0 ? newFilters : null;
      setFilters({
        group_bys: newValue,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.group_by ? "border-primary" : ""}
      >
        Group By
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.keys(map).map((value) => ({ value }))}
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
