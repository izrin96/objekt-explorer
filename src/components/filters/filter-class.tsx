"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import type { ValidClass } from "@/lib/universal/cosmo/common";
import { Button, Menu, MenuContent, MenuItem, MenuLabel } from "../ui";

type Props = {
  hideEtc?: boolean;
};

export default function ClassFilter({ hideEtc = false }: Props) {
  const { selectedClass } = useCosmoArtist();
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.class);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidClass>).values());
      setFilters({
        class: values.length ? values : null,
      });
    },
    [setFilters],
  );

  const availableClasses = selectedClass.filter((s) =>
    hideEtc ? ["Zero", "Welcome"].includes(s) === false : true,
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.class?.length ? "!inset-ring-primary" : ""}>
        {t("class")}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {availableClasses.map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{item}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
