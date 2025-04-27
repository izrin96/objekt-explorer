"use client";

import type { Selection } from "react-aria-components";
import { Button, Menu } from "@/components/ui";
import { useCallback, useMemo } from "react";
import { ValidType, validType } from "@/lib/universal/transfers";
import { parseAsStringLiteral, useQueryState } from "nuqs";

const map: Record<ValidType, string> = {
  all: "All",
  mint: "Mint",
  received: "Received",
  sent: "Sent",
  spin: "Spin",
};

export function useTypeFilter() {
  return useQueryState(
    "type",
    parseAsStringLiteral(validType).withDefault("all")
  );
}

export default function TypeFilter() {
  const [type, setType] = useTypeFilter();
  const selected = useMemo(() => new Set(type ? [type] : ["all"]), [type]);

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as string[];
      const newValue =
        newFilters.length > 0 ? (newFilters[0] as ValidType) : "all";
      setType(newValue);
    },
    [setType]
  );

  return (
    <Menu>
      <Button intent="outline">Type</Button>
      <Menu.Content
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        items={validType.map((value) => ({ value }))}
        className="min-w-52"
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={map[item.value]}>
            <Menu.Label>{map[item.value]}</Menu.Label>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
