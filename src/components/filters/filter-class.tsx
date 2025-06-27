"use client";

import { ValidClass, validClasses } from "@/lib/universal/cosmo/common";
import { useCallback, useMemo } from "react";
import { Button, Menu } from "../ui";
import { useFilters } from "@/hooks/use-filters";
import { parseSelected } from "@/lib/utils";
import { Selection } from "react-stately";

type Props = {
  hideZeroWelcome?: boolean;
};

export default function ClassFilter({ hideZeroWelcome = false }: Props) {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.class), [filters.class]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidClass>(key, true);
      setFilters({
        class: value,
      });
    },
    [setFilters]
  );

  const availableClasses = validClasses.filter((s) =>
    hideZeroWelcome ? !["Zero", "Welcome"].includes(s) : true
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.class?.length ? "!inset-ring-primary" : ""}
      >
        Class
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.values(availableClasses).map((value) => ({ value }))}
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
