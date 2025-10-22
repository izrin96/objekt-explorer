import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import { type ValidGroupBy, validGroupBy } from "@/lib/universal/cosmo/common";
import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export default function GroupByFilter() {
  const [filters, setFilters] = useFilters();

  const map = {
    artist: "Artist",
    class: "Class",
    collectionNo: "Collection No.",
    member: "Member",
    season: "Season",
    seasonCollectionNo: "Season & Collection No.",
  };

  const selected = new Set(filters.group_by ? [filters.group_by] : []);

  const update = useCallback(
    (key: Selection) => {
      const value = Array.from((key as Set<ValidGroupBy>).values()).at(0) ?? null;
      setFilters({
        group_by: value,
        group_dir: ["member", "class"].includes(value ?? "") ? "asc" : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.group_by ? "!inset-ring-primary" : ""}>
        Group by
      </Button>
      <MenuContent
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {Object.values(validGroupBy).map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
