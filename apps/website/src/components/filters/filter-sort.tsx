import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { Selection } from "react-aria-components";

import { useFilters } from "@/hooks/use-filters";
import { defaultSort } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuDescription, MenuItem, MenuLabel } from "../intentui/menu";

type Props = {
  enabled?: ValidCustomSort[];
};

export default function SortFilter({ enabled = defaultSort }: Props) {
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.sort ? [filters.sort] : ["date"]);

  const map: Record<ValidCustomSort, { label: string; desc: string }> = {
    date: { label: m.filter_sort_by_date_label(), desc: m.filter_sort_by_date_desc() },
    season: { label: m.filter_sort_by_season_label(), desc: m.filter_sort_by_season_desc() },
    collectionNo: {
      label: m.filter_sort_by_collection_no_label(),
      desc: m.filter_sort_by_collection_no_desc(),
    },
    serial: { label: m.filter_sort_by_serial_label(), desc: m.filter_sort_by_serial_desc() },
    duplicate: { label: m.filter_sort_by_dups_label(), desc: m.filter_sort_by_dups_desc() },
    member: { label: m.filter_sort_by_member_label(), desc: m.filter_sort_by_member_desc() },
    rare: { label: m.filter_sort_by_rare_label(), desc: m.filter_sort_by_rare_desc() },
  };

  function update(key: Selection) {
    const value = Array.from((key as Set<ValidCustomSort>).values()).at(0) ?? "date";

    return setFilters((current) => ({
      sort: value === "date" ? null : value,
      sort_dir: ["serial", "member", "rare"].includes(value) ? "asc" : null,
      grouped: value === "duplicate" ? true : value === "serial" ? null : current.grouped,
    }));
  }

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.sort}>
        {m.filter_sort_by_label()}
      </Button>
      <MenuContent
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {enabled.map((item) => {
          const i = map[item];
          return (
            <MenuItem key={item} id={item} textValue={i.label}>
              <MenuLabel>{i.label}</MenuLabel>
              <MenuDescription>{i.desc}</MenuDescription>
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
}
