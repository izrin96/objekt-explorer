import { CubeIcon } from "@phosphor-icons/react";
import type { User } from "@repo/api/services/auth";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import { ChangelogButton } from "@/components/layout/changelog";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavSearch } from "@/components/layout/nav-search";
import { SystemStatus, statusDotClass, useOverallStatus } from "@/components/layout/system-status";
import { SignedOutNav, UserMenu } from "@/components/layout/user-menu";
import { Group } from "@/components/ui/group";
import { MessagesIcon } from "@/features/chat/messages-icon";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { useUserSocket } from "@/features/notifications/use-user-socket";
import { useCurrentUser } from "@/features/user/hooks";
import { SITE_NAME, cn, containerClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";

function useNavLinks() {
  const { data: user } = useCurrentUser();
  const links = [
    { key: "home", label: m.home_title(), to: "/", exact: true },
    { key: "market", label: m.nav_market(), to: "/market", exact: false },
    { key: "trade", label: m.nav_trade(), to: "/trade", exact: false },
    { key: "activity", label: m.nav_activity(), to: "/activity", exact: false },
    // `/list/{slug}` is any user's list, not one of the viewer's own
    { key: "list", label: m.nav_my_list(), to: "/list", exact: true },
    // the link flow at `/link/connect` still belongs to My Cosmo
    {
      key: "link",
      label: m.nav_my_cosmo_link(),
      to: "/account/profiles",
      exact: false,
      also: "/link",
    },
  ] as const;
  // `/list` and My Cosmo are the signed-in user's own; signed out they only bounce to /login
  return user ? links : links.filter((link) => link.key !== "list" && link.key !== "link");
}

export type NavLink = ReturnType<typeof useNavLinks>[number];

/** Whether a link counts as current under its `also` prefix, beside its own path. */
export function useAlsoActive() {
  const pathname = useLocation({ select: (s) => s.pathname });
  return (link: NavLink) =>
    "also" in link && (pathname === link.also || pathname.startsWith(`${link.also}/`));
}

export function AppNav() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const overall = useOverallStatus();
  const links = useNavLinks();
  const alsoActive = useAlsoActive();

  // z-30: above the cards' own layers and the floating select bar, below every
  // Base UI overlay (sheet / drawer / dialog / popover / menu at z-50, toasts at z-60)
  return (
    <header className="bg-background/88 sticky top-0 z-30 border-b backdrop-blur-lg">
      <div className={cn(containerClass, "flex h-13 items-center gap-3.5 px-5")}>
        <MobileNav links={links} />

        {/* never wraps or squashes; the search field absorbs the shortfall */}
        <Link
          to="/"
          className="font-display flex shrink-0 items-center gap-2 text-base font-bold tracking-tight whitespace-nowrap"
        >
          <span
            className={cn(
              "bg-foreground text-background after:border-background relative grid size-6 shrink-0 place-items-center rounded-[7px] after:absolute after:-right-0.5 after:-bottom-0.5 after:size-2 after:rounded-full after:border-2",
              statusDotClass(overall),
            )}
          >
            <CubeIcon weight="bold" className="size-3.5" />
          </span>
          {/* on a phone the search field needs the room, and between `lg` and `xl`
              the nav links do; the logo still reads as home */}
          <span className="max-sm:sr-only lg:max-xl:sr-only">{SITE_NAME}</span>
        </Link>

        <nav className="ml-1.5 hidden shrink-0 gap-0.5 lg:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              data-status={alsoActive(l) ? "active" : undefined}
              className="text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground rounded-[7px] px-2.5 py-1.5 text-sm font-medium whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <span className="flex-1 max-lg:hidden" />

        {/* below `lg` the changelog moves into the sheet and the logo's dot
            carries the status, so the search field keeps the room */}
        <Group className="max-lg:hidden">
          <SystemStatus />
          <ChangelogButton />
        </Group>

        <NavSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {user ? <SignedInActions user={user.user} /> : <SignedOutNav />}
      </div>
    </header>
  );
}

/** One socket per tab: the bell and the messages icon share it. */
function SignedInActions({ user }: { user: User }) {
  useUserSocket();
  return (
    <div className="flex shrink-0 items-center gap-1 pointer-coarse:gap-2">
      <MessagesIcon />
      <NotificationBell />
      <UserMenu user={user} />
    </div>
  );
}
