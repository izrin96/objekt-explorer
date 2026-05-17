import type { ValidArtist } from "@repo/cosmo/types/common";
import { useCallback } from "react";
import type { Selection } from "react-aria-components";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../intentui/menu";

export default function ArtistFilter() {
  const { selectedArtists } = useCosmoArtist();
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.artist ?? []);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidArtist>).values());
      return setFilters({
        artist: values.length ? values : null,
        member: null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.artist}>
        {m.filter_artist()}
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
