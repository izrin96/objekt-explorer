"use client";

import type { Selection } from "react-aria-components";

import { type ValidEdition, validEdition } from "@repo/cosmo/types/common";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { useFilters } from "@/hooks/use-filters";
import { getEditionStr } from "@/lib/utils";

import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export default function EditionFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.edition);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidEdition>).values());
      return setFilters({
        edition: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.edition?.length}>
        {t("edition")}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {validEdition.map((item) => (
          <MenuItem key={item} id={item} textValue={getEditionStr(item)}>
            <MenuLabel>{getEditionStr(item)}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
