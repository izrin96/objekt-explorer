"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { Button, Menu, MenuContent, MenuItem, MenuLabel } from "@/components/ui";
import { type ValidType, validType } from "@/lib/universal/transfers";

const map: Record<ValidType, string> = {
  all: "All",
  mint: "Mint",
  received: "Received",
  sent: "Sent",
  spin: "Spin",
};

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const [type, setType] = useTypeFilter();
  const selected = new Set(type ? [type] : ["all"]);

  const update = useCallback(
    (key: Selection) => {
      const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
      setType(value === "all" ? null : value);
    },
    [setType],
  );

  return (
    <Menu>
      <Button intent="outline" className={type ? "!inset-ring-primary" : ""}>
        Event
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
