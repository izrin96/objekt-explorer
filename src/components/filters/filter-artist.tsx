"use client";

import type { Selection } from "react-aria-components";
import { Button, Menu } from "../ui";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { useCallback, useMemo } from "react";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { useFilters } from "@/hooks/use-filters";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function ArtistFilter({ artists }: Props) {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(
    () => new Set(filters.artist ?? []),
    [filters.artist]
  );

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as ValidArtist[];
      setFilters({
        artist: newFilters.length > 0 ? newFilters : null,
        member: null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.artist ? "inset-ring-primary" : ""}
      >
        Artist
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={artists}
        className="min-w-52"
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
