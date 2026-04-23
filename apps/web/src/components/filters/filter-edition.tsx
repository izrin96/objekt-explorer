"use client";

import { type ValidEdition, validEdition } from "@repo/cosmo/types/common";
import { useIntlayer } from "next-intlayer";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";

import { useFilters } from "@/hooks/use-filters";
import { getEditionStr } from "@/lib/utils";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../intentui/menu";

export default function EditionFilter() {
  const content = useIntlayer("filter");
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
        {content.edition.value}
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
