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
  const selected = new Set(filters.on_offline);

  const map = {
    online: content.digital.value,
    offline: content.physical.value,
  };

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidOnlineType>).values());
      return setFilters({
        on_offline: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.on_offline?.length}>
        {content.physical.value}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {Object.values(validOnlineTypes).map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
