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
    () => new Set(filters.artist ? [filters.artist] : []),
    [filters.artist]
  );

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as ValidArtist[];
      setFilters({
        artist: newFilters.length > 0 ? newFilters[0] : null,
        member: null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        appearance="outline"
        className={
          filters.artist
            ? "data-pressed:border-primary data-hovered:border-primary border-primary"
            : ""
        }
      >
        Artist
      </Button>
      <Menu.Content
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        items={artists}
        className="min-w-52"
      >
        {(item) => (
          <Menu.Radio id={item.name} textValue={item.title}>
            {item.title}
          </Menu.Radio>
        )}
      </Menu.Content>
    </Menu>
  );
}
