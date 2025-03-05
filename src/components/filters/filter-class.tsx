"use client";

import { type Selection } from "@react-types/shared";
import { ValidClass, validClasses } from "@/lib/universal/cosmo/common";
import { useCallback, useMemo } from "react";
import { Button, Menu } from "../ui";
import { useFilters } from "@/hooks/use-filters";

type Props = {
  hideZeroWelcome?: boolean;
};

export default function ClassFilter({ hideZeroWelcome = false }: Props) {
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

  const availableClasses = validClasses.filter((s) =>
    hideZeroWelcome ? !["Zero", "Welcome"].includes(s) : true
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.class?.length ? "inset-ring-primary" : ""}
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
