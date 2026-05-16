import { type ValidOnlineType, validOnlineTypes } from "@repo/cosmo/types/common";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useIntlayer } from "react-intlayer";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../intentui/menu";

export default function OnlineFilter() {
  const content = useIntlayer("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.on_offline ?? ["all"]);

  const map = {
    all: content.all.value,
    online: content.digital.value,
    offline: content.physical.value,
  } as Record<string, string>;

  const update = useCallback(
    (key: Selection) => {
      const value = Array.from(key as Set<string>)[0];
      if (!value || value === "all") {
        return setFilters({ on_offline: null });
      }
      return setFilters({
        on_offline: [value as ValidOnlineType],
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.on_offline?.length}>
        {content.type.value}
      </Button>
      <MenuContent selectionMode="single" selectedKeys={selected} onSelectionChange={update}>
        {["all", ...Object.values(validOnlineTypes)].map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
