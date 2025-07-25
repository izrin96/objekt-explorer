"use client";

import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { Button, Menu } from "@/components/ui";
import { useFilters } from "@/hooks/use-filters";
import type { ValidGroupBy } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";

const map: Record<string, string> = {
  artist: "Artist",
  member: "Member",
  season: "Season",
  class: "Class",
};

export default function GroupBysFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.group_bys ?? []), [filters.group_bys]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidGroupBy>(key, true);
      setFilters({
        group_bys: value,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline">Group By</Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {Object.keys(map).map((item) => (
          <Menu.Item key={item} id={item} textValue={map[item]}>
            <Menu.Label>{map[item]}</Menu.Label>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}
