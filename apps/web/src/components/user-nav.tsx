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
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import UserAccountModal from "@/components/auth/account/user-account";
import { useSession } from "@/hooks/use-user";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
import type { User } from "@/lib/server/auth";
import { getListHref, parseNickname } from "@/lib/utils";

import { GenerateDiscordFormatModal } from "./list/modal/generate-discord";
import { CreateListModal } from "./list/modal/manage-list";
import { Avatar } from "./ui/avatar-custom";
import { buttonStyles } from "./ui/button";
import { Link } from "./ui/link";
import { Loader } from "./ui/loader";
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
} from "./ui/menu";

export default function UserNav() {
  const t = useTranslations("nav");
  const { data } = useSession();

  return (
    <div className="inline-flex gap-2 text-sm">
      {data ? (
        <UserMenu user={data.user} />
      ) : (
        <Link href="/login" className={buttonStyles({ intent: "plain", size: "sm" })}>
          {t("sign_in")}
        </Link>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const t = useTranslations("nav");
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
        <MenuTrigger aria-label={t("open_menu")}>
          <Avatar
            alt={user.name}
            initials={user.name.charAt(0)}
            size="md"
            isSquare
            src={user.image}
          />
        </MenuTrigger>
        <MenuContent className="sm:min-w-56">
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
            <MenuLabel>{t("account")}</MenuLabel>
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            onAction={() =>
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    void queryClient.refetchQueries({
                      queryKey: ["session"],
                    });
                    toast(t("sign_out_success"));
                    router.refresh();
                  },
                },
              })
            }
          >
            <SignOutIcon data-slot="icon" />
            <MenuLabel>{t("sign_out")}</MenuLabel>
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
  const t = useTranslations("nav");
  return (
    <MenuSubMenu>
      <MenuItem>
        <HeartIcon data-slot="icon" />
        <MenuLabel>{t("my_list")}</MenuLabel>
      </MenuItem>
      <MenuContent>
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
              <span>{t("no_list_found")}</span>
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
          <MenuLabel>{t("create_list")}</MenuLabel>
        </MenuItem>
        <MenuItem onAction={openDiscordFormat}>
          <DiscordLogoIcon data-slot="icon" />
          <MenuLabel>{t("discord_format")}</MenuLabel>
        </MenuItem>
        <MenuItem href={`/list`}>
          <GearSixIcon data-slot="icon" />
          <MenuLabel>{t("manage_list")}</MenuLabel>
        </MenuItem>
      </MenuContent>
    </MenuSubMenu>
  );
}

function MyCosmoProfileMenuItem() {
  const t = useTranslations("nav");
  const { data } = useQuery(orpc.profile.list.queryOptions());
  return (
    <MenuSubMenu>
      <MenuItem>
        <DeviceMobileIcon data-slot="icon" />
        <MenuLabel>{t("my_cosmo_link")}</MenuLabel>
      </MenuItem>
      <MenuContent>
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
              <span>{t("no_cosmo_found")}</span>
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
          <MenuLabel>{t("manage_cosmo_link")}</MenuLabel>
        </MenuItem>
      </MenuContent>
    </MenuSubMenu>
  );
}
