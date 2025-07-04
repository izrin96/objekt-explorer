"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import type { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

type Props = {
  artists: CosmoArtistWithMembersBFF[];
};

export default function MemberFilter({ artists }: Props) {
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
      <Menu.Content
        selectionMode="multiple"
        selectedKeys={selected}
        onSelectionChange={update}
        items={artists}
        className="min-w-44"
      >
        {(artist) => (
          <Menu.Section title={artist.title} items={artist.artistMembers} id={artist.name}>
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
