import { MagnifyingGlassIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { compareWithProfile, findProfile } from "@/features/compare/profile-target";
import { useSetCompare } from "@/features/compare/use-compare";
import { useUserProfiles } from "@/features/user/hooks";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

export function MarketCompareButton({ activeAddress }: { activeAddress: string | undefined }) {
  const profiles = useUserProfiles();
  const setCompare = useSetCompare();

  if (profiles.length === 0) return null;

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            data-active={activeAddress !== undefined || undefined}
            className="data-active:border-foreground gap-1.5"
          />
        }
      >
        <MagnifyingGlassIcon />
        {m.common_actions_compare()}
      </MenuTrigger>
      <MenuPopup align="start" className="min-w-44">
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
      </MenuPopup>
    </Menu>
  );
}
