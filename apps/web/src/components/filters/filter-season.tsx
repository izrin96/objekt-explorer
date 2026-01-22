"use client";

import type { ValidSeason } from "@repo/cosmo/types/common";
import type { Selection } from "react-aria-components";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";

import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export default function SeasonFilter() {
  const { seasons } = useFilterData();
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.season);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidSeason>).values());
      return setFilters({
        season: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.season?.length}>
        {t("season")}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {seasons.map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{item}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
