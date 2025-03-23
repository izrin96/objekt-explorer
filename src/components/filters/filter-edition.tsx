"use client";

import { type Selection } from "@react-types/shared";
import { useCallback, useMemo } from "react";
import { Button, Menu } from "../ui";
import { useFilters } from "@/hooks/use-filters";
import { ValidEdition, validEdition } from "@/lib/universal/cosmo/common";

export default function EditionFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.edition), [filters.edition]);

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as ValidEdition[];
      setFilters({
        edition: newFilters.length > 0 ? newFilters : null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.edition?.length ? "!inset-ring-primary" : ""}
      >
        Edition
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={validEdition.map((value) => ({ value }))}
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
