import {
  DeviceMobileIcon,
  DiscordLogoIcon,
  GearIcon,
  GearSixIcon,
  HeartIcon,
  PlusIcon,
  SignInIcon,
  SignOutIcon,
  UserIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import UserAccountModal from "@/components/auth/account/user-account";
import { Avatar } from "@/components/intentui/avatar-custom";
import { buttonStyles } from "@/components/intentui/button";
import { Link } from "@/components/intentui/link";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuItemLink,
  MenuLabel,
  MenuSection,
  MenuSeparator,
  MenuSubMenu,
  MenuTrigger,
} from "@/components/intentui/menu";
import { CreateListModal } from "@/components/list/modal/create-list-modal";
import { GenerateDiscordFormatModal } from "@/components/list/modal/generate-discord";
import { useUserLists, useUserProfiles } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/lib/server/auth.server";
import { getListLinkOption, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { AboutMenu, AboutModal } from "./about";
import { SettingsModal } from "./settings-modal";

export function LoginButton() {
  return (
    <Link
      to="/login"
      className={buttonStyles({
        intent: "plain",
        size: "sm",
        className: "[--btn-icon:var(--color-fg)]",
      })}
    >
      <SignInIcon />
      <span className="hidden sm:block">{m.nav_sign_in()}</span>
    </Link>
  );
}

export function UserMenu({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [genOpen, setGenOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingOpen, setSettingOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />
      <UserAccountModal open={accountOpen} setOpen={setAccountOpen} />
      <CreateListModal open={createListOpen} setOpen={setCreateListOpen} />
      <AboutModal open={aboutOpen} setOpen={setAboutOpen} />
      <SettingsModal open={settingOpen} setOpen={setSettingOpen} />

      <Menu>
        <MenuTrigger aria-label={m.nav_open_menu()}>
          <Avatar
            alt={user?.name ?? ""}
            initials={(user?.name ?? "").charAt(0)}
            size="md"
            isSquare
            src={user.image}
          />
        </MenuTrigger>
        <MenuContent placement="bottom left" popover={{ offset: -2 }}>
          <MenuSection>
            <MenuHeader separator>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <div className="flex gap-2">
                  {user.discord && (
                    <span className="text-muted-fg inline-flex gap-1 font-normal">
                      {user.discord}
                      <DiscordLogoIcon size={16} weight="regular" className="self-center" />
                    </span>
                  )}
                  {user.twitter && (
                    <span className="text-muted-fg inline-flex gap-1 font-normal">
                      {user.twitter}
                      <XLogoIcon size={16} weight="regular" className="self-center" />
                    </span>
                  )}
                </div>
              </div>
            </MenuHeader>
          </MenuSection>

          <MyListMenuItem
            openCreateList={() => setCreateListOpen(true)}
            openDiscordFormat={() => setGenOpen(true)}
          />

          <MyCosmoProfileMenuItem />

          <MenuItem onAction={() => setAccountOpen(true)}>
            <UserIcon />
            <MenuLabel>{m.nav_account()}</MenuLabel>
          </MenuItem>

          <MenuItem onAction={() => setSettingOpen(true)}>
            <GearIcon />
            <MenuLabel>{m.nav_setting()}</MenuLabel>
          </MenuItem>

          <MenuSeparator />

          <AboutMenu onAction={() => setAboutOpen(true)} />

          <MenuSeparator />

          <MenuItem
            intent="danger"
            onAction={() =>
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    void queryClient.invalidateQueries();
                    toast(m.nav_sign_out_success());
                  },
                },
              })
            }
          >
            <SignOutIcon />
            <MenuLabel>{m.nav_sign_out()}</MenuLabel>
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}

function MyListMenuItem({
  openCreateList,
  openDiscordFormat,
}: {
  openCreateList: () => void;
  openDiscordFormat: () => void;
}) {
  const data = useUserLists();
  return (
    <MenuSubMenu>
      <MenuItem>
        <HeartIcon />
        <MenuLabel>{m.nav_my_list()}</MenuLabel>
      </MenuItem>
      <MenuContent placement="left top" popover={{ offset: -6 }}>
        {data.length === 0 && (
          <MenuItem isDisabled>
            <MenuLabel>
              <span>{m.nav_no_list_found()}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data.map((a) => (
          <MenuItemLink key={a.slug} {...getListLinkOption(a)}>
            <MenuLabel>
              {a.name}{" "}
              {a.profile && (
                <span className="text-muted-fg text-xs">
                  ({parseNickname(a.profile.address, a.profile.nickname)})
                </span>
              )}
            </MenuLabel>
          </MenuItemLink>
        ))}
        <MenuItem onAction={openCreateList}>
          <PlusIcon />
          <MenuLabel>{m.nav_create_list()}</MenuLabel>
        </MenuItem>
        <MenuItem onAction={openDiscordFormat}>
          <DiscordLogoIcon />
          <MenuLabel>{m.nav_discord_format()}</MenuLabel>
        </MenuItem>
        <MenuItemLink to="/list">
          <GearSixIcon />
          <MenuLabel>{m.nav_manage_list()}</MenuLabel>
        </MenuItemLink>
      </MenuContent>
    </MenuSubMenu>
  );
}

function MyCosmoProfileMenuItem() {
  const data = useUserProfiles();
  return (
    <MenuSubMenu>
      <MenuItem>
        <DeviceMobileIcon />
        <MenuLabel>{m.nav_my_cosmo_link()}</MenuLabel>
      </MenuItem>
      <MenuContent placement="left top" popover={{ offset: -6 }}>
        {data.length === 0 && (
          <MenuItem isDisabled>
            <MenuLabel>
              <span>{m.nav_no_cosmo_found()}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data.map((a) => (
          <MenuItemLink
            key={a.address}
            to="/@{$nickname}"
            params={{ nickname: a.nickname || a.address.toLowerCase() }}
          >
            <MenuLabel>{parseNickname(a.address, a.nickname)}</MenuLabel>
          </MenuItemLink>
        ))}
        <MenuItemLink to="/link">
          <GearSixIcon />
          <MenuLabel>{m.nav_manage_cosmo_link()}</MenuLabel>
        </MenuItemLink>
      </MenuContent>
    </MenuSubMenu>
  );
}
