"use client";

import type { Selection } from "react-aria-components";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@/components/ui/menu";
import { type ValidType, validType } from "@/lib/universal/transfers";

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const t = useTranslations("trades.filter_type");
  const [type, setType] = useTypeFilter();
  const selected = new Set(type ? [type] : ["all"]);

  const map = useMemo(
    () =>
      Object.fromEntries(
        validType.map((key) => [key, t(key as "all" | "mint" | "received" | "sent" | "spin")]),
      ),
    [t],
  );

  const update = (key: Selection) => {
    const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
    return setType(value === "all" ? null : value);
  };

  return (
    <Menu>
      <Button intent="outline" data-selected={type}>
        {t("label")}
      </Button>
      <MenuContent selectionMode="single" selectedKeys={selected} onSelectionChange={update}>
        {validType.map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
