"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function ArtistFilter({ artists }: Props) {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.artist ?? []), [filters.artist]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidArtist>(key, true);
      setFilters({
        artist: value,
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
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={artists}
      >
        {(item) => (
          <Menu.Item id={item.name} textValue={item.title}>
            <Menu.Label>{item.title}</Menu.Label>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
