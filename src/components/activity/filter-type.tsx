"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { type ValidType, validType } from "@/lib/universal/activity";
import { Button, Menu, MenuContent, MenuItem, MenuLabel } from "../ui";

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const t = useTranslations("filter.event");
  const [type, setType] = useTypeFilter();
  const selected = useMemo(() => new Set(type ? [type] : ["all"]), [type]);

  const map = useMemo<Record<ValidType, string>>(
    () => ({
      all: t("all"),
      mint: t("mint"),
      transfer: t("transfer"),
      spin: t("spin"),
    }),
    [t],
  );

  const update = useCallback(
    (key: Selection) => {
      const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
      setType(value === "all" ? null : value);
    },
    [setType],
  );

  return (
    <Menu>
      <Button intent="outline" className={type ? "!inset-ring-primary" : ""}>
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
