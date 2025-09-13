"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilters } from "@/hooks/use-filters";
import { parseSelected } from "@/lib/utils";
import { Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSection } from "../ui";

export default function MemberFilter() {
  const { selectedArtists } = useCosmoArtist();
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.member), [filters.member]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<string>(key, true);
      setFilters({
        member: value,
        artist: null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.member ? "!inset-ring-primary" : ""}>
        {t("member")}
      </Button>
      <MenuContent
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-44"
      >
        {selectedArtists.map((artist) => (
          <MenuSection key={artist.name} title={artist.title} id={artist.name}>
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
