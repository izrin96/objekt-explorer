import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { Selection } from "react-aria-components";
import { useIntlayer } from "react-intlayer";

import { type ValidType, validType } from "@/lib/universal/activity";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../intentui/menu";

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const content = useIntlayer("filter");
  const [type, setType] = useTypeFilter();
  const selected = new Set(type ? [type] : ["all"]);

  const map = {
    all: content.event.all.value,
    mint: content.event.mint.value,
    transfer: content.event.transfer.value,
    spin: content.event.spin.value,
  };

  const update = (key: Selection) => {
    const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
    return setType(value === "all" ? null : value);
  };

  return (
    <Menu>
      <Button intent="outline" data-selected={type}>
        {content.event.label.value}
      </Button>
      <MenuContent selectionMode="single" selectedKeys={selected} onSelectionChange={update}>
        {validType.map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
