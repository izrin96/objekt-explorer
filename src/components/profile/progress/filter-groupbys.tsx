"use client";

import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { Button, Menu, MenuContent, MenuItem, MenuLabel } from "@/components/ui";
import { useFilters } from "@/hooks/use-filters";
import type { ValidGroupBy } from "@/lib/universal/cosmo/common";

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
      const values = Array.from((key as Set<ValidGroupBy>).values());
      setFilters({
        group_bys: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline">Group By</Button>
      <MenuContent
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {Object.keys(map).map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
