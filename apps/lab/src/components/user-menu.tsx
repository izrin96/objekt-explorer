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
} from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { AccountDialog } from "@/components/account/account-dialog";
import { ArtistsSubmenu, SettingsDialog } from "@/components/account/settings-dialog";
import { CreateListDialog } from "@/components/list/create-list-dialog";
import { notImplemented } from "@/components/shared/not-implemented";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { useAccount } from "@/store/account";
import { LIST_TYPE_LABEL, LIST_TYPE_VARIANT, useLists } from "@/store/lists";
import { useSession } from "@/store/session";

/** the user's lists, as a Base UI submenu — the app uses intentui `MenuSubMenu` */
function MyListsSubmenu({ onCreate }: { onCreate: () => void }) {
  const lists = useLists((s) => s.lists);

  return (
    <MenuSub>
      <MenuSubTrigger>
        <HeartIcon />
        My lists
      </MenuSubTrigger>
      <MenuSubPopup className="min-w-52">
        {lists.length === 0 && <MenuItem disabled>No list found</MenuItem>}
        {lists.map((list) => (
          <MenuItem key={list.id} render={<Link to="/list/$slug" params={{ slug: list.id }} />}>
            <span className="truncate">{list.name}</span>
            <Badge variant={LIST_TYPE_VARIANT[list.type]} size="sm" className="ml-auto">
              {LIST_TYPE_LABEL[list.type]}
            </Badge>
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem onClick={onCreate}>
          <PlusIcon />
          Create list
        </MenuItem>
        <MenuItem onClick={() => notImplemented({ title: "Copied Discord format" })}>
          <DiscordLogoIcon />
          Discord format
        </MenuItem>
        <MenuItem render={<Link to="/list" />}>
          <GearSixIcon />
          All lists
        </MenuItem>
      </MenuSubPopup>
    </MenuSub>
  );
}

/**
 * Nav avatar menu, mirroring the app's `UserMenu`: identity header, My lists
 * submenu, My Cosmo, Account, Settings, Sign out. Base UI's Menu handles
 * arrow keys, submenu open/close, Esc and returning focus to the trigger.
 */
export function UserMenu() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createListOpen, setCreateListOpen] = useState(false);
  const account = useAccount((s) => s.account);
  const saveAccount = useAccount((s) => s.save);

  const avatar = (
    <Avatar className="size-7.5">
      {account.image && <AvatarImage src={account.image} alt="" />}
      <AvatarFallback className="bg-linear-to-br from-[#d8b4a0] to-[#8c5a4a]" />
    </Avatar>
  );

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              aria-label="Account menu"
              className="focus-visible:ring-ring cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            />
          }
        >
          {avatar}
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-56">
          {/* a real MenuGroup + MenuSeparator rather than a bordered div: the
              separator carries its own `my-1`, so the first item no longer sits
              flush against the line */}
          <MenuGroup className="flex items-center gap-2.5 px-2 py-1">
            {avatar}
            <div className="flex min-w-0 flex-col">
              {/* no username concept in the app: the display name is the identity */}
              <span className="truncate text-sm font-medium">{account.name}</span>
            </div>
          </MenuGroup>

          <MenuSeparator />

          <ArtistsSubmenu />

          <MyListsSubmenu onCreate={() => setCreateListOpen(true)} />

          <MenuItem render={<Link to="/link" />}>
            <DeviceMobileIcon />
            My Cosmo
          </MenuItem>

          <MenuItem onClick={() => setAccountOpen(true)}>
            <UserIcon />
            Account
          </MenuItem>

          <MenuItem onClick={() => setSettingsOpen(true)}>
            <GearIcon />
            Settings
          </MenuItem>

          <MenuSeparator />

          <MenuItem
            variant="destructive"
            onClick={() => {
              useSession.getState().signOut();
              toastManager.add({ type: "info", title: "Signed out" });
            }}
          >
            <SignOutIcon />
            Sign out
          </MenuItem>
        </MenuPopup>
      </Menu>
      <AccountDialog
        account={account}
        onSave={saveAccount}
        open={accountOpen}
        onOpenChange={setAccountOpen}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CreateListDialog open={createListOpen} onOpenChange={setCreateListOpen} />
    </>
  );
}

/**
 * What the nav shows instead of the avatar once signed out: the Settings gear
 * (the only way left to the artist scope) and a plain Sign in button, which
 * mirrors `LoginButton` in `apps/website` — icon always, label from `md` up.
 *
 * Sign in is a link to `/login`, not a session toggle, and it carries the page
 * you were on as `?redirect=` so the form lands you back here rather than on
 * Home.
 */
export function SignedOutNav() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // the nav is on `/login` too, and parking `/login` as its own redirect
  // would only be undone by the route's signed-in guard a moment later
  const href = useLocation({ select: (s) => (s.pathname === "/login" ? undefined : s.href) });

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Settings"
        onClick={() => setSettingsOpen(true)}
      >
        <GearIcon />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label="Sign in"
        render={<Link to="/login" search={{ redirect: href }} />}
      >
        <SignInIcon />
        <span className="hidden md:block">Sign in</span>
      </Button>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
