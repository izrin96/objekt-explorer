"use client";

import type { ValidGroupBy } from "@repo/cosmo/types/common";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";

import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@/components/ui/menu";
import { useFilters } from "@/hooks/use-filters";

const groupByKeys = ["artist", "member", "season", "class"] as const;

export default function GroupBysFilter() {
  const t = useTranslations("filter.group_by");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.group_bys ?? []);

  const map = useMemo(
    () =>
      Object.fromEntries(
        groupByKeys.map((key) => [key, t(key as "artist" | "member" | "season" | "class")]),
      ),
    [t],
  );

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidGroupBy>).values());
      return setFilters({
        group_bys: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline">{t("label")}</Button>
      <MenuContent
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {groupByKeys.map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
