"use client";

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
import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import UserAccountModal from "@/components/auth/account/user-account";
import { useSession } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
import type { User } from "@/lib/server/auth";
import { getListHref, parseNickname } from "@/lib/utils";

import { Avatar } from "./intentui/avatar-custom";
import { buttonStyles } from "./intentui/button";
import { Link } from "./intentui/link";
import { Loader } from "./intentui/loader";
import {
  Menu,
  MenuContent,
  MenuHeader,
  MenuItem,
  MenuLabel,
  MenuSection,
  MenuSeparator,
  MenuSubMenu,
  MenuTrigger,
} from "./intentui/menu";
import { GenerateDiscordFormatModal } from "./list/modal/generate-discord";
import { CreateListModal } from "./list/modal/manage-list";

export default function UserNav() {
  const content = useIntlayer("nav");
  const { data } = useSession();

  return (
    <div className="inline-flex gap-2 text-sm">
      {data ? (
        <UserMenu user={data.user} />
      ) : (
        <Link href="/login" className={buttonStyles({ intent: "plain", size: "sm" })}>
          {content.sign_in.value}
        </Link>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const content = useIntlayer("nav");
  const queryClient = useQueryClient();
  const [genOpen, setGenOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />
      <UserAccountModal open={accountOpen} setOpen={setAccountOpen} />
      <CreateListModal open={createListOpen} setOpen={setCreateListOpen} />

      <Menu>
        <MenuTrigger aria-label={content.open_menu.value}>
          <Avatar
            alt={user.name}
            initials={user.name.charAt(0)}
            size="md"
            isSquare
            src={user.image}
          />
        </MenuTrigger>
        <MenuContent placement="bottom left">
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
            <MenuLabel>{content.account.value}</MenuLabel>
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            onAction={() =>
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    void queryClient.invalidateQueries({
                      queryKey: ["session"],
                    });
                    toast(content.sign_out_success.value);
                    router.refresh();
                  },
                },
              })
            }
          >
            <SignOutIcon data-slot="icon" />
            <MenuLabel>{content.sign_out.value}</MenuLabel>
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
  const content = useIntlayer("nav");
  return (
    <MenuSubMenu>
      <MenuItem>
        <HeartIcon data-slot="icon" />
        <MenuLabel>{content.my_list.value}</MenuLabel>
      </MenuItem>
      <MenuContent placement="left top">
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
              <span>{content.no_list_found.value}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data?.map((a) => (
          <MenuItem key={a.slug} href={getListHref(a)}>
            <MenuLabel>
              {a.name}{" "}
              {a.profileAddress && (
                <span className="text-muted-fg text-xs">
                  ({parseNickname(a.profileAddress, a.nickname)})
                </span>
              )}
            </MenuLabel>
          </MenuItem>
        ))}
        <MenuItem onAction={openCreateList}>
          <PlusIcon data-slot="icon" />
          <MenuLabel>{content.create_list.value}</MenuLabel>
        </MenuItem>
        <MenuItem onAction={openDiscordFormat}>
          <DiscordLogoIcon data-slot="icon" />
          <MenuLabel>{content.discord_format.value}</MenuLabel>
        </MenuItem>
        <MenuItem href={`/list`}>
          <GearSixIcon data-slot="icon" />
          <MenuLabel>{content.manage_list.value}</MenuLabel>
        </MenuItem>
      </MenuContent>
    </MenuSubMenu>
  );
}

function MyCosmoProfileMenuItem() {
  const content = useIntlayer("nav");
  const { data } = useQuery(orpc.profile.list.queryOptions());
  return (
    <MenuSubMenu>
      <MenuItem>
        <DeviceMobileIcon data-slot="icon" />
        <MenuLabel>{content.my_cosmo_link.value}</MenuLabel>
      </MenuItem>
      <MenuContent placement="left top">
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
              <span>{content.no_cosmo_found.value}</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data?.map((a) => (
          <MenuItem key={a.address} href={`/@${a.nickname || a.address}`}>
            <MenuLabel>{parseNickname(a.address, a.nickname)}</MenuLabel>
          </MenuItem>
        ))}
        <MenuItem href={`/link`}>
          <GearSixIcon data-slot="icon" />
          <MenuLabel>{content.manage_cosmo_link.value}</MenuLabel>
        </MenuItem>
      </MenuContent>
    </MenuSubMenu>
  );
}
