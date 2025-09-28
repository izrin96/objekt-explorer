"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import { type ValidOnlineType, validOnlineTypes } from "@/lib/universal/cosmo/common";
import { Button, Menu, MenuContent, MenuItem, MenuLabel } from "../ui";

export default function OnlineFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.on_offline);

  const map = {
    online: t("digital"),
    offline: t("physical"),
  };

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidOnlineType>).values());
      setFilters({
        on_offline: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.on_offline?.length ? "!inset-ring-primary" : ""}>
        {t("physical")}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {Object.values(validOnlineTypes).map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
