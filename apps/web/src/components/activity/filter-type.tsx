"use client";

import type { Selection } from "react-aria-components";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { type ValidType, validType } from "@/lib/universal/activity";

import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const t = useTranslations("filter.event");
  const [type, setType] = useTypeFilter();
  const selected = new Set(type ? [type] : ["all"]);

  const map = {
    all: t("all"),
    mint: t("mint"),
    transfer: t("transfer"),
    spin: t("spin"),
  };

  const update = (key: Selection) => {
    const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
    setType(value === "all" ? null : value);
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
