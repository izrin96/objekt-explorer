import {
  CardsThreeIcon,
  DiscordLogoIcon,
  GearIcon,
  InfoIcon,
  LinkIcon,
  PlusIcon,
  SignInIcon,
  SignOutIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { User } from "@repo/api/services/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { AboutDialog } from "@/components/layout/about";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { AccountDialog } from "@/features/account/account-dialog";
import { DiscordFormatDialog } from "@/features/discord/discord-format-dialog";
import { CreateListDialog } from "@/features/list/create-list-dialog";
import { getListLinkOption } from "@/features/list/list-link";
import { ListTypeBadge } from "@/features/list/list-type-badge";
import { ArtistsSubmenu } from "@/features/settings/artists-menu";
import { SettingsDialog } from "@/features/settings/settings-dialog";
import { useUserLists } from "@/features/user/hooks";
import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  return (
    <Avatar className={className}>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

/**
 * `/login` is a page like any other, so parking it as its own redirect would
 * only be undone by the sign-in guard a moment later.
 */
export function useSignInSearch(): { redirect: string | undefined } {
  const redirect = useLocation({ select: (s) => (s.pathname === "/login" ? undefined : s.href) });

  return { redirect };
}

export function UserMenu({ user }: { user: User }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const queryClient = useQueryClient();

  const signOut = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries();
    toastManager.add({ type: "info", title: m.nav_sign_out_success() });
  };

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              aria-label={m.nav_open_menu()}
              className="focus-visible:ring-ring cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            />
          }
        >
          <UserAvatar user={user} className="size-7.5" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-56">
          {/* a real MenuGroup + MenuSeparator rather than a bordered div: the
              separator carries its own `my-1`, so the first item no longer sits
              flush against the line */}
          <MenuGroup className="flex items-center gap-2.5 px-2 py-1">
            <UserAvatar user={user} className="size-7.5" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{user.name}</span>
            </div>
          </MenuGroup>

          <MenuSeparator />

          <ArtistsSubmenu />

          <MyListsSubmenu
            onCreateList={() => setCreateListOpen(true)}
            onDiscordFormat={() => setDiscordOpen(true)}
          />

          <MenuItem render={<Link to="/link" />}>
            <LinkIcon />
            {m.nav_my_cosmo_link()}
          </MenuItem>

          <MenuItem onClick={() => setAccountOpen(true)}>
            <UserIcon />
            {m.nav_account()}
          </MenuItem>

          <MenuItem onClick={() => setSettingsOpen(true)}>
            <GearIcon />
            {m.nav_setting()}
          </MenuItem>

          <MenuSeparator />

          <MenuItem onClick={() => setAboutOpen(true)}>
            <InfoIcon />
            {m.nav_about()}
          </MenuItem>

          <MenuSeparator />

          <MenuItem variant="destructive" onClick={() => void signOut()}>
            <SignOutIcon />
            {m.nav_sign_out()}
          </MenuItem>
        </MenuPopup>
      </Menu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      <CreateListDialog open={createListOpen} onOpenChange={setCreateListOpen} />
      <DiscordFormatDialog open={discordOpen} onOpenChange={setDiscordOpen} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
}

/** The dialogs live beside the menu: a menu takes its whole popup with it on click. */
function MyListsSubmenu({
  onCreateList,
  onDiscordFormat,
}: {
  onCreateList: () => void;
  onDiscordFormat: () => void;
}) {
  const lists = useUserLists();

  return (
    <MenuSub>
      <MenuSubTrigger>
        <CardsThreeIcon />
        {m.nav_my_list()}
      </MenuSubTrigger>
      <MenuSubPopup className="min-w-52">
        {lists.length === 0 ? (
          <MenuItem disabled>{m.nav_no_list_found()}</MenuItem>
        ) : (
          lists.map((list) => (
            <MenuItem key={list.slug} render={<Link {...getListLinkOption(list)} />}>
              <span className="truncate">{list.name}</span>
              <ListTypeBadge type={list.listTypeNew} className="ml-auto" />
            </MenuItem>
          ))
        )}

        <MenuSeparator />

        <MenuItem onClick={onCreateList}>
          <PlusIcon />
          {m.nav_create_list()}
        </MenuItem>
        <MenuItem onClick={onDiscordFormat}>
          <DiscordLogoIcon weight="fill" />
          {m.nav_discord_format()}
        </MenuItem>
        <MenuItem render={<Link to="/list" />}>
          <CardsThreeIcon />
          {m.nav_manage_list()}
        </MenuItem>
      </MenuSubPopup>
    </MenuSub>
  );
}

/**
 * What the nav shows instead of the avatar once signed out: the Settings gear
 * (the only way left to the artist scope) and a Sign in link.
 */
export function SignedOutNav() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const search = useSignInSearch();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.nav_setting()}
        onClick={() => setSettingsOpen(true)}
      >
        <GearIcon />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={m.nav_sign_in()}
        render={<Link to="/login" search={search} />}
      >
        <SignInIcon />
        <span className="hidden md:block">{m.nav_sign_in()}</span>
      </Button>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
