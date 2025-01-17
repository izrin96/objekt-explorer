"use client";

import { type Selection } from "@react-types/shared";
import { ValidClass, validClasses } from "@/lib/universal/cosmo/common";
import { useCallback, useMemo } from "react";
import { Button, Menu } from "../ui";
import { useFilters } from "@/hooks/use-filters";

export default function ClassFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.class), [filters.class]);

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as ValidClass[];
      setFilters({
        class: newFilters.length > 0 ? newFilters : null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        appearance="outline"
        className={
          filters.class?.length
            ? "data-pressed:border-primary data-hovered:border-primary border-primary"
            : ""
        }
      >
        Class
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.values(validClasses).map((value) => ({ value }))}
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={item.value}>
            <Menu.Label>{item.value}</Menu.Label>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
