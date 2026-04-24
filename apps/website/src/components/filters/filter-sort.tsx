import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { Selection } from "react-aria-components";
import { useIntlayer } from "react-intlayer";

import { useFilters } from "@/hooks/use-filters";
import { defaultSort } from "@/lib/utils";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuDescription, MenuItem, MenuLabel } from "../intentui/menu";

type Props = {
  enabled?: ValidCustomSort[];
};

export default function SortFilter({ enabled = defaultSort }: Props) {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.sort ? [filters.sort] : ["date"]);

  const map: Record<ValidCustomSort, { label: string; desc: string }> = {
    date: { label: content.sort_by.date.label.value, desc: content.sort_by.date.desc.value },
    season: { label: content.sort_by.season.label.value, desc: content.sort_by.season.desc.value },
    collectionNo: {
      label: content.sort_by.collection_no.label.value,
      desc: content.sort_by.collection_no.desc.value,
    },
    serial: { label: content.sort_by.serial.label.value, desc: content.sort_by.serial.desc.value },
    duplicate: { label: content.sort_by.dups.label.value, desc: content.sort_by.dups.desc.value },
    member: { label: content.sort_by.member.label.value, desc: content.sort_by.member.desc.value },
    rare: { label: content.sort_by.rare.label.value, desc: content.sort_by.rare.desc.value },
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
        {content.sort_by.label.value}
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
