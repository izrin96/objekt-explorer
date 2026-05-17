import {
  DeviceMobileIcon,
  DiscordLogoIcon,
  GearSixIcon,
  HeartIcon,
  PlusIcon,
  SignOutIcon,
  UserIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import UserAccountModal from "@/components/auth/account/user-account";
import { useSession } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
import type { User } from "@/lib/server/auth.server";
import { getListLinkOption, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { AboutMenu, AboutModal } from "./about";
import { Avatar } from "./intentui/avatar-custom";
import { buttonStyles } from "./intentui/button";
import { Link } from "./intentui/link";
import { Loader } from "./intentui/loader";
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
} from "./intentui/menu";
import { GenerateDiscordFormatModal } from "./list/modal/generate-discord";
import { CreateListModal } from "./list/modal/manage-list";

export default function UserNav() {
  const { data } = useSession();

  return (
    <div className="inline-flex gap-2 text-sm">
      {data ? (
        <UserMenu user={data.user} />
      ) : (
        <Link to="/login" className={buttonStyles({ intent: "plain", size: "sm" })}>
          {m.nav_sign_in()}
        </Link>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [genOpen, setGenOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />
      <UserAccountModal open={accountOpen} setOpen={setAccountOpen} />
      <CreateListModal open={createListOpen} setOpen={setCreateListOpen} />
      <AboutModal open={aboutOpen} setOpen={setAboutOpen} />

      <Menu>
        <MenuTrigger aria-label={m.nav_open_menu()}>
          <Avatar
            alt={user.name}
            initials={user.name.charAt(0)}
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
            <UserIcon data-slot="icon" />
            <MenuLabel>{m.nav_account()}</MenuLabel>
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
            <SignOutIcon data-slot="icon" />
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
  const { data } = useQuery(orpc.list.list.queryOptions());
  return (
    <MenuSubMenu>
      <MenuItem>
        <HeartIcon data-slot="icon" />
        <MenuLabel>{m.nav_my_list()}</MenuLabel>
      </MenuItem>
      <MenuContent placement="left top" popover={{ offset: -6 }}>
        {!data && (
          <MenuItem isDisabled>
            <MenuLabel>
              <Loader variant="ring" />
            </MenuLabel>
          </MenuItem>
        )}
        {data && data.length === 0 && (
          <MenuItem isDisabled>
            <MenuLabel>
              <span>{m.nav_no_list_found()}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data?.map((a) => (
          <MenuItemLink key={a.slug} {...getListLinkOption(a)}>
            <MenuLabel>
              {a.name}{" "}
              {a.profileAddress && (
                <span className="text-muted-fg text-xs">
                  ({parseNickname(a.profileAddress, a.nickname)})
                </span>
              )}
            </MenuLabel>
          </MenuItemLink>
        ))}
        <MenuItem onAction={openCreateList}>
          <PlusIcon data-slot="icon" />
          <MenuLabel>{m.nav_create_list()}</MenuLabel>
        </MenuItem>
        <MenuItem onAction={openDiscordFormat}>
          <DiscordLogoIcon data-slot="icon" />
          <MenuLabel>{m.nav_discord_format()}</MenuLabel>
        </MenuItem>
        <MenuItemLink to="/list">
          <GearSixIcon data-slot="icon" />
          <MenuLabel>{m.nav_manage_list()}</MenuLabel>
        </MenuItemLink>
      </MenuContent>
    </MenuSubMenu>
  );
}

function MyCosmoProfileMenuItem() {
  const { data } = useQuery(orpc.profile.list.queryOptions());
  return (
    <MenuSubMenu>
      <MenuItem>
        <DeviceMobileIcon data-slot="icon" />
        <MenuLabel>{m.nav_my_cosmo_link()}</MenuLabel>
      </MenuItem>
      <MenuContent placement="left top" popover={{ offset: -6 }}>
        {!data && (
          <MenuItem isDisabled>
            <MenuLabel>
              <Loader variant="ring" />
            </MenuLabel>
          </MenuItem>
        )}
        {data && data.length === 0 && (
          <MenuItem isDisabled>
            <MenuLabel>
              <span>{m.nav_no_cosmo_found()}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data?.map((a) => (
          <MenuItemLink
            key={a.address}
            to="/@{$nickname}"
            params={{ nickname: a.nickname || a.address }}
          >
            <MenuLabel>{parseNickname(a.address, a.nickname)}</MenuLabel>
          </MenuItemLink>
        ))}
        <MenuItemLink to="/link">
          <GearSixIcon data-slot="icon" />
          <MenuLabel>{m.nav_manage_cosmo_link()}</MenuLabel>
        </MenuItemLink>
      </MenuContent>
    </MenuSubMenu>
  );
}
