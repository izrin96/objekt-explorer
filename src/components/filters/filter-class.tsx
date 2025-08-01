"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import type { ValidClass } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

type Props = {
  hideEtc?: boolean;
};

export default function ClassFilter({ hideEtc = false }: Props) {
  const { selectedClass } = useCosmoArtist();
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

  const availableClasses = selectedClass.filter((s) =>
    hideEtc ? ["Zero", "Welcome"].includes(s) === false : true,
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.class?.length ? "!inset-ring-primary" : ""}>
        {t("class")}
      </Button>
      <Menu.Content selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {availableClasses.map((item) => (
          <Menu.Item key={item} id={item} textValue={item}>
            <Menu.Label>{item}</Menu.Label>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}
