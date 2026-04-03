"use client";

import { useIntlayer } from "next-intlayer";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { Selection } from "react-aria-components";

import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@/components/ui/menu";
import { type ValidType, validType } from "@/lib/universal/transfers";

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const content = useIntlayer("trades");
  const [type, setType] = useTypeFilter();
  const selected = new Set(type ? [type] : ["all"]);

  const map = {
    all: content.filter_type.all.value,
    mint: content.filter_type.mint.value,
    received: content.filter_type.received.value,
    sent: content.filter_type.sent.value,
    spin: content.filter_type.spin.value,
  };

  const update = (key: Selection) => {
    const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
    return setType(value === "all" ? null : value);
  };

  return (
    <Menu>
      <Button intent="outline" data-selected={type}>
        {content.filter_type.label.value}
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
