"use client";

import { type Selection } from "react-stately";
import {
  ValidOnlineType,
  validOnlineTypes,
} from "@/lib/universal/cosmo/common";
import { useCallback, useMemo } from "react";
import { Menu, Button } from "../ui";
import { useFilters } from "@/hooks/use-filters";
import { parseSelected } from "@/lib/utils";

const map: Record<ValidOnlineType, string> = {
  online: "Digital",
  offline: "Physical",
};

export default function OnlineFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(
    () => new Set(filters.on_offline),
    [filters.on_offline]
  );

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidOnlineType>(key, true);
      setFilters({
        on_offline: value,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.on_offline?.length ? "!inset-ring-primary" : ""}
      >
        Physical
      </Button>
      <Menu.Content
        respectScreen={false}
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.values(validOnlineTypes).map((value) => ({ value }))}
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={item.value}>
            <Menu.Label>{map[item.value]}</Menu.Label>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
