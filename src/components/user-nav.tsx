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
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import UserAccountModal from "@/components/auth/account/user-account";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
import type { User } from "@/lib/server/auth";
import { GenerateDiscordFormatModal } from "./list/modal/generate-discord";
import { CreateListModal } from "./list/modal/manage-list";
import { Avatar, buttonStyles, Link, Loader, Menu } from "./ui";

export default function UserNav() {
  const t = useTranslations("nav");
  const { data, isPending } = authClient.useSession();

  if (isPending) return;

  return (
    <div className="inline-flex gap-2 text-sm">
      {data ? (
        <UserMenu user={data.user} />
      ) : (
        <Link href="/login" className={buttonStyles({ intent: "outline", size: "sm" })}>
          {t("sign_in")}
        </Link>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const t = useTranslations("nav");
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
        <Menu.Trigger aria-label="Open Menu">
          <Avatar
            alt={user.name}
            initials={user.name.charAt(0)}
            size="md"
            isSquare
            src={user.image}
          />
        </Menu.Trigger>
        <Menu.Content className="sm:min-w-56">
          <Menu.Section>
            <Menu.Header separator>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <div className="flex gap-2">
                  {user.discord && (
                    <span className="inline-flex gap-1 font-normal text-muted-fg">
                      {user.discord}
                      <DiscordLogoIcon size={16} weight="regular" className="self-center" />
                    </span>
                  )}
                  {user.twitter && (
                    <span className="inline-flex gap-1 font-normal text-muted-fg">
                      {user.twitter}
                      <XLogoIcon size={16} weight="regular" className="self-center" />
                    </span>
                  )}
                </div>
              </div>
            </Menu.Header>
          </Menu.Section>

          <MyListMenuItem
            openCreateList={() => setCreateListOpen(true)}
            openDiscordFormat={() => setGenOpen(true)}
          />

          <MyCosmoProfileMenuItem />

          <Menu.Item onAction={() => setAccountOpen(true)}>
            <UserIcon data-slot="icon" />
            <Menu.Label>Account</Menu.Label>
          </Menu.Item>

          <Menu.Separator />

          <Menu.Item
            onAction={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    toast.success("Sign out successful");
                    router.refresh();
                  },
                },
              });
            }}
          >
            <SignOutIcon data-slot="icon" />
            <Menu.Label>{t("sign_out")}</Menu.Label>
          </Menu.Item>
        </Menu.Content>
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
  const { data, isLoading } = useQuery(orpc.list.list.queryOptions());
  const items = data ?? [];
  return (
    <Menu.Submenu>
      <Menu.Item>
        <HeartIcon data-slot="icon" />
        <Menu.Label>My List</Menu.Label>
      </Menu.Item>
      <Menu.Content>
        {isLoading && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <Loader variant="ring" />
            </Menu.Label>
          </Menu.Item>
        )}
        {!isLoading && items.length === 0 && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <span>No list found</span>
            </Menu.Label>
          </Menu.Item>
        )}
        {items.map((a) => (
          <Menu.Item key={a.slug} href={`/list/${a.slug}`}>
            <Menu.Label>{a.name}</Menu.Label>
          </Menu.Item>
        ))}
        <Menu.Item onAction={openCreateList}>
          <PlusIcon data-slot="icon" />
          <Menu.Label>Create list</Menu.Label>
        </Menu.Item>
        <Menu.Item onAction={openDiscordFormat}>
          <DiscordLogoIcon data-slot="icon" />
          <Menu.Label>Discord format</Menu.Label>
        </Menu.Item>
        <Menu.Item href={`/list`}>
          <GearSixIcon data-slot="icon" />
          <Menu.Label>Manage list</Menu.Label>
        </Menu.Item>
      </Menu.Content>
    </Menu.Submenu>
  );
}

function MyCosmoProfileMenuItem() {
  const t = useTranslations("nav");
  const { data, isLoading } = useQuery(orpc.profile.list.queryOptions());
  const items = data ?? [];
  return (
    <Menu.Submenu>
      <Menu.Item>
        <DeviceMobileIcon data-slot="icon" />
        <Menu.Label>{t("my_cosmo_link")}</Menu.Label>
      </Menu.Item>
      <Menu.Content>
        {isLoading && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <Loader variant="ring" />
            </Menu.Label>
          </Menu.Item>
        )}
        {!isLoading && items.length === 0 && (
          <Menu.Item isDisabled>
            <Menu.Label>
              <span>{t("no_cosmo_found")}</span>
            </Menu.Label>
          </Menu.Item>
        )}
        {items.map((a) => (
          <Menu.Item key={a.address} href={`/@${a.nickname}`}>
            <Menu.Label>{a.nickname}</Menu.Label>
          </Menu.Item>
        ))}
        <Menu.Item href={`/link`}>
          <GearSixIcon data-slot="icon" />
          <Menu.Label>{t("manage_cosmo_link")}</Menu.Label>
        </Menu.Item>
      </Menu.Content>
    </Menu.Submenu>
  );
}
