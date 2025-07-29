"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import type { ValidSeason } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

export default function SeasonFilter() {
  const { selectedSeason } = useCosmoArtist();
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.season), [filters.season]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidSeason>(key, true);
      setFilters({
        season: value,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.season?.length ? "!inset-ring-primary" : ""}>
        {t("season")}
      </Button>
      <Menu.Content selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {selectedSeason.map((item) => (
          <Menu.Item key={item} id={item} textValue={item}>
            <Menu.Label>{item}</Menu.Label>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}
