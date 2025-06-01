"use client";

import { type Selection } from "react-stately";
import { useCallback, useMemo } from "react";
import { Button, Menu } from "../ui";
import { useFilters } from "@/hooks/use-filters";
import { ValidEdition, validEdition } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";

export default function EditionFilter() {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.edition), [filters.edition]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidEdition>(key, true);
      setFilters({
        edition: value,
      });
    },
    [setFilters]
  );

  return (
    <Menu respectScreen={false}>
      <Button
        intent="outline"
        className={filters.edition?.length ? "!inset-ring-primary" : ""}
      >
        Edition
      </Button>
      <Menu.Content
        respectScreen={false}
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
