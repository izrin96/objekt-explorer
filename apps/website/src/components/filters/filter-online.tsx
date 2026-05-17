import { type ValidOnlineType, validOnlineTypes } from "@repo/cosmo/types/common";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";

import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../intentui/menu";

export default function OnlineFilter() {
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.on_offline ?? ["all"]);

  const map = {
    all: m.filter_all(),
    online: m.filter_digital(),
    offline: m.filter_physical(),
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
        {m.filter_type()}
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
