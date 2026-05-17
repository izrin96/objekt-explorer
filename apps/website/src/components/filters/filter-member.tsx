import { useCallback } from "react";
import type { Selection } from "react-aria-components";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSection } from "../intentui/menu";

export default function MemberFilter() {
  const { selectedArtists } = useCosmoArtist();
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.member);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<string>).values());
      return setFilters({
        member: values.length ? values : null,
        artist: null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.member}>
        {m.filter_member()}
      </Button>
      <MenuContent
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-44"
      >
        {selectedArtists.map((artist) => (
          <MenuSection key={artist.name} label={artist.title} id={artist.name}>
            {artist.artistMembers.map((member) => (
              <MenuItem key={member.name} id={member.name} textValue={member.name}>
                <MenuLabel>
                  {artist.name === "artms" ? member.name : `${member.alias} ${member.name}`}
                </MenuLabel>
              </MenuItem>
            ))}
          </MenuSection>
        ))}
      </MenuContent>
    </Menu>
  );
}
