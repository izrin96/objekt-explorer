"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import type { ValidSeason } from "@/lib/universal/cosmo/common";
import { Button, Menu, MenuContent, MenuItem, MenuLabel } from "../ui";

export default function SeasonFilter() {
  const { selectedSeason } = useCosmoArtist();
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.season);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidSeason>).values());
      setFilters({
        season: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.season?.length ? "!inset-ring-primary" : ""}>
        {t("season")}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {selectedSeason.map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{item}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
