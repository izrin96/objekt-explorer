"use client";

import { type ValidGroupBy, validGroupBy } from "@repo/cosmo/types/common";
import { useIntlayer } from "next-intlayer";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export default function GroupByFilter() {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();

  const map = {
    artist: content.group_by.artist.value,
    class: content.group_by.class.value,
    collectionNo: content.group_by.collection_no.value,
    member: content.group_by.member.value,
    season: content.group_by.season.value,
    seasonCollectionNo: content.group_by.season_collection_no.value,
  };

  const selected = new Set(filters.group_by ? [filters.group_by] : []);

  const update = useCallback(
    (key: Selection) => {
      const value = Array.from((key as Set<ValidGroupBy>).values()).at(0) ?? null;
      return setFilters({
        group_by: value,
        group_dir: ["member", "class"].includes(value ?? "") ? "asc" : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.group_by}>
        {content.group_by.label.value}
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
