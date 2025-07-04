"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-stately";
import { useFilters } from "@/hooks/use-filters";
import { type ValidClass, validClasses } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

type Props = {
  hideZeroWelcome?: boolean;
};

export default function ClassFilter({ hideZeroWelcome = false }: Props) {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.class), [filters.class]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidClass>(key, true);
      setFilters({
        class: value,
      });
    },
    [setFilters],
  );

  const availableClasses = validClasses.filter((s) =>
    hideZeroWelcome ? !["Zero", "Welcome"].includes(s) : true,
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.class?.length ? "!inset-ring-primary" : ""}>
        {t("class")}
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
