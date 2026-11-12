import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { compareWithProfile, findProfile } from "@/features/compare/profile-target";
import { useSetCompare } from "@/features/compare/use-compare";
import { toolbarTrigger } from "@/features/filters/toolbar-trigger";
import { ListLabel } from "@/features/list/list-label";
import { useUserLists, useUserProfiles } from "@/features/user/hooks";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

export function MarketCompareButton({
  activeAddress,
  activeList,
}: {
  activeAddress: string | undefined;
  activeList: string | undefined;
}) {
  const profiles = useUserProfiles();
  const lists = useUserLists();
  const setCompare = useSetCompare();

  if (profiles.length === 0 && lists.length === 0) return null;

  return (
    <Menu>
      <MenuTrigger
        data-active={activeAddress !== undefined || activeList !== undefined || undefined}
        className={toolbarTrigger}
      >
        <MagnifyingGlassIcon />
        {m.common_actions_compare()}
      </MenuTrigger>
      <MenuPopup align="start" className="max-w-72 min-w-44">
        {profiles.length > 0 ? (
          <MenuGroup>
            <MenuGroupLabel>{m.market_compare_label()}</MenuGroupLabel>
            <MenuRadioGroup
              value={activeAddress ?? null}
              onValueChange={(value: string | null) => {
                const profile = value === null ? undefined : findProfile(profiles, value);
                if (profile) setCompare(compareWithProfile(profile, "missing"));
              }}
            >
              {profiles.map((profile) => (
                <MenuRadioItem key={profile.address} value={profile.address} closeOnClick>
                  {displayNickname(profile.address, profile.nickname)}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuGroup>
        ) : null}
        {profiles.length > 0 && lists.length > 0 ? <MenuSeparator /> : null}
        {lists.length > 0 ? (
          <MenuGroup>
            <MenuGroupLabel>{m.market_compare_list_label()}</MenuGroupLabel>
            <MenuRadioGroup
              value={activeList ?? null}
              onValueChange={(value: string | null) => {
                if (value !== null)
                  setCompare({ cmp_type: "list", cmp_to: value, cmp_mode: "matches" });
              }}
            >
              {lists.map((list) => (
                <MenuRadioItem
                  key={list.slug}
                  value={list.slug}
                  label={list.name}
                  closeOnClick
                  // the item's text cell is a bare 1fr track, which grows to the name unless told not to
                  className="[&>span]:min-w-0"
                >
                  <ListLabel name={list.name} type={list.listType} />
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </MenuGroup>
        ) : null}
      </MenuPopup>
    </Menu>
  );
}
