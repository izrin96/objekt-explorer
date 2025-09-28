"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { Button, Menu, MenuContent, MenuItem, MenuLabel } from "../ui";

export default function ArtistFilter() {
  const { selectedArtists } = useCosmoArtist();
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.artist ?? []);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidArtist>).values());
      setFilters({
        artist: values.length ? values : null,
        member: null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.artist ? "!inset-ring-primary" : ""}>
        {t("artist")}
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {selectedArtists.map((item) => (
          <MenuItem key={item.name} id={item.name} textValue={item.title}>
            <MenuLabel>{item.title}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
