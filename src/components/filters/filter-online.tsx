"use client";

import { type Selection } from "@react-types/shared";
import {
  ValidOnlineType,
  validOnlineTypes,
} from "@/lib/universal/cosmo/common";
import { useCallback, useMemo } from "react";
import { Menu, Button } from "../ui";
import { useFilters } from "@/hooks/use-filters";

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
      const newFilters = [...key] as ValidOnlineType[];
      setFilters({
        on_offline: newFilters.length > 0 ? newFilters : null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        appearance="outline"
        className={
          filters.on_offline?.length
            ? "data-pressed:border-primary data-hovered:border-primary border-primary"
            : ""
        }
      >
        Physical
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.values(validOnlineTypes).map((value) => ({ value }))}
      >
        {(item) => (
          <Menu.Checkbox id={item.value} textValue={item.value}>
            {map[item.value]}
          </Menu.Checkbox>
        )}
      </Menu.Content>
    </Menu>
  );
}
