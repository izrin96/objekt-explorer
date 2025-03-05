"use client";

import type { Selection } from "react-aria-components";
import { Button, Menu } from "../ui";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { useCallback, useMemo } from "react";
import { useFilters } from "@/hooks/use-filters";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function MemberFilter({ artists }: Props) {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.member), [filters.member]);

  const update = useCallback(
    (key: Selection) => {
      const newFilters = [...key] as string[];
      setFilters({
        member: newFilters.length > 0 ? newFilters : null,
        artist: null,
      });
    },
    [setFilters]
  );

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.member ? "inset-ring-primary" : ""}
      >
        Member
      </Button>
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={artists}
        className="min-w-52"
      >
        {(artist) => (
          <Menu.Section
            title={artist.title}
            items={artist.artistMembers}
            id={artist.name}
          >
            {(member) => (
              <Menu.Item id={member.name} textValue={member.name}>
                <Menu.Label>{member.name}</Menu.Label>
              </Menu.Item>
            )}
          </Menu.Section>
        )}
      </Menu.Content>
    </Menu>
  );
}
