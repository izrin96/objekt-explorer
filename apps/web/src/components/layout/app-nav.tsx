import { CubeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ChangelogButton } from "@/components/layout/changelog";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavSearch } from "@/components/layout/nav-search";
import { SystemStatus, statusDotClass, useOverallStatus } from "@/components/layout/system-status";
import { SignedOutNav, UserMenu } from "@/components/layout/user-menu";
import { Group } from "@/components/ui/group";
import { useCurrentUser } from "@/features/user/hooks";
import { SITE_NAME, cn, containerClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";

function useNavLinks() {
  const { data: user } = useCurrentUser();
  const links = [
    { key: "home", label: m.home_title(), to: "/", exact: true },
    { key: "market", label: m.nav_market(), to: "/market", exact: false },
    { key: "activity", label: m.nav_activity(), to: "/activity", exact: false },
    // `/list/{slug}` is any user's list, not one of the viewer's own
    { key: "list", label: m.nav_my_list(), to: "/list", exact: true },
  ] as const;
  // `/list` is the signed-in user's own lists; signed out it only bounces to /login
  return user ? links : links.filter((link) => link.key !== "list");
}

export type NavLink = ReturnType<typeof useNavLinks>[number];

export function AppNav() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const overall = useOverallStatus();
  const links = useNavLinks();

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
          {/* on a phone the search field needs the room, and between `md` and `lg`
              the nav links do; the logo still reads as home */}
          <span className="max-sm:sr-only md:max-lg:sr-only">{SITE_NAME}</span>
        </Link>

        <nav className="ml-1.5 hidden shrink-0 gap-0.5 md:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground rounded-[7px] px-2.5 py-1.5 text-sm font-medium whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <span className="flex-1 max-md:hidden" />

        {/* below `md` the changelog moves into the sheet and the logo's dot
            carries the status, so the search field keeps the room */}
        <Group className="max-md:hidden">
          <SystemStatus />
          <ChangelogButton />
        </Group>

        <NavSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {user ? <UserMenu user={user.user} /> : <SignedOutNav />}
      </div>
    </header>
  );
}
