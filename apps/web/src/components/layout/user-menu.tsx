import { GearIcon, SignInIcon, SignOutIcon } from "@phosphor-icons/react";
import type { User } from "@repo/api/services/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { ArtistsSubmenu } from "@/features/settings/artists-menu";
import { SettingsDialog } from "@/features/settings/settings-dialog";
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

          <MenuItem onClick={() => setSettingsOpen(true)}>
            <GearIcon />
            {m.nav_setting()}
          </MenuItem>

          <MenuSeparator />

          <MenuItem variant="destructive" onClick={() => void signOut()}>
            <SignOutIcon />
            {m.nav_sign_out()}
          </MenuItem>
        </MenuPopup>
      </Menu>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
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
