"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-stately";
import { useFilters } from "@/hooks/use-filters";
import { type ValidOnlineType, validOnlineTypes } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

export default function OnlineFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.on_offline), [filters.on_offline]);

  const map = useMemo<Record<ValidOnlineType, string>>(
    () => ({
      online: t("digital"),
      offline: t("physical"),
    }),
    [t],
  );

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidOnlineType>(key, true);
      setFilters({
        on_offline: value,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.on_offline?.length ? "!inset-ring-primary" : ""}>
        {t("physical")}
      </Button>
      <Menu.Content
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
