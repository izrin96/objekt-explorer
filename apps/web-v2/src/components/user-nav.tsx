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
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import UserAccountModal from "@/components/auth/account/user-account";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
import type { User } from "@/lib/server/auth";
import { parseNickname } from "@/lib/utils";
import { GenerateDiscordFormatModal } from "./list/modal/generate-discord";
import { CreateListModal } from "./list/modal/manage-list";
import { Avatar } from "./ui/avatar";
import { buttonStyles } from "./ui/button";
import { Link } from "./ui/link";
import { Loader } from "./ui/loader";
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
} from "./ui/menu";

export default function UserNav() {
  const { data } = useSuspenseQuery(
    orpc.session.queryOptions({
      staleTime: Infinity,
    }),
  );

  return (
    <div className="inline-flex gap-2 text-sm">
      {data ? (
        <UserMenu user={data.user} />
      ) : (
        <Link to="/login" className={buttonStyles({ intent: "outline", size: "sm" })}>
          Sign in
        </Link>
      )}
    </div>
  );
}

function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [genOpen, setGenOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />
      <UserAccountModal open={accountOpen} setOpen={setAccountOpen} />
      <CreateListModal open={createListOpen} setOpen={setCreateListOpen} />

      <Menu>
        <MenuTrigger aria-label="Open Menu">
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
            </MenuHeader>
          </MenuSection>

          <MyListMenuItem
            openCreateList={() => setCreateListOpen(true)}
            openDiscordFormat={() => setGenOpen(true)}
          />

          <MyCosmoProfileMenuItem />

          <MenuItem onAction={() => setAccountOpen(true)}>
            <UserIcon data-slot="icon" />
            <MenuLabel>Account</MenuLabel>
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            onAction={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    queryClient.invalidateQueries({
                      queryKey: orpc.session.queryKey(),
                    });
                    toast.success("Sign out successful");
                    router.invalidate();
                  },
                },
              });
            }}
          >
            <SignOutIcon data-slot="icon" />
            <MenuLabel>Sign out</MenuLabel>
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
        <MenuLabel>My List</MenuLabel>
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
              <span>No list found</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data?.map((a) => (
          <MenuItemLink to="/list/$slug" params={{ slug: a.slug }} key={a.slug}>
            <MenuLabel>{a.name}</MenuLabel>
          </MenuItemLink>
        ))}
        <MenuItem onAction={openCreateList}>
          <PlusIcon data-slot="icon" />
          <MenuLabel>Create list</MenuLabel>
        </MenuItem>
        <MenuItem onAction={openDiscordFormat}>
          <DiscordLogoIcon data-slot="icon" />
          <MenuLabel>Discord format</MenuLabel>
        </MenuItem>
        <MenuItemLink to="/list">
          <GearSixIcon data-slot="icon" />
          <MenuLabel>Manage list</MenuLabel>
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
        <MenuLabel>My Cosmo Link</MenuLabel>
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
              <span>No Cosmo found</span>
            </MenuLabel>
          </MenuItem>
        )}
        {data?.map((a) => (
          <MenuItemLink
            to="/@{$nickname}"
            params={{ nickname: a.nickname ?? a.address }}
            key={a.address}
          >
            <MenuLabel>{parseNickname(a.address, a.nickname)}</MenuLabel>
          </MenuItemLink>
        ))}
        <MenuItemLink to="/link">
          <GearSixIcon data-slot="icon" />
          <MenuLabel>Manage link</MenuLabel>
        </MenuItemLink>
      </MenuContent>
    </MenuSubMenu>
  );
}
