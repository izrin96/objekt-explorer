import { CubeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ChangelogButton } from "@/components/layout/changelog";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavSearch } from "@/components/layout/nav-search";
import { SystemStatus, statusDotClass, useOverallStatus } from "@/components/layout/system-status";
import { SignedOutNav, UserMenu } from "@/components/layout/user-menu";
import { useCurrentUser } from "@/features/user/hooks";
import { SITE_NAME, cn, containerClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";

function useNavLinks() {
  return [
    { key: "home", label: m.home_title(), to: "/" },
    { key: "market", label: m.nav_market(), to: "/market" },
    { key: "activity", label: m.nav_activity(), to: "/activity" },
    { key: "list", label: m.nav_my_list(), to: "/list" },
  ] as const;
}

export type NavLink = ReturnType<typeof useNavLinks>[number];

export function AppNav() {
  // the nav owns which of its two surfaces is open, so the mobile sheet can
  // hand off to the search dialog without either one owning the other
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const overall = useOverallStatus();
  const links = useNavLinks();

  // z-30: above the cards' own layers and the floating select bar, below every
  // Base UI overlay (sheet / drawer / dialog / popover / menu at z-50, toasts at z-60)
  return (
    <header className="bg-background/88 sticky top-0 z-30 border-b backdrop-blur-lg">
      <div className={cn(containerClass, "flex h-13 items-center gap-3.5 px-5")}>
        <MobileNav links={links} onSearch={() => setSearchOpen(true)} />

        {/* never wraps or squashes; the search field absorbs the shortfall */}
        <Link
          to="/"
          className="font-display flex shrink-0 items-center gap-2 text-[15px] font-bold tracking-tight whitespace-nowrap"
        >
          <span
            className={cn(
              "bg-foreground text-background after:border-background relative grid size-6 shrink-0 place-items-center rounded-[7px] after:absolute after:-right-0.5 after:-bottom-0.5 after:size-2 after:rounded-full after:border-2",
              statusDotClass(overall),
            )}
          >
            <CubeIcon weight="bold" className="size-3.5" />
          </span>
          <span>{SITE_NAME}</span>
        </Link>

        <nav className="ml-1.5 hidden shrink-0 gap-0.5 md:flex">
          {links.map((l) => (
            <Link
              key={l.key}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground rounded-[7px] px-2.5 py-1.5 text-[13.5px] font-medium whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <SystemStatus className="max-md:hidden" />

        <span className="flex-1" />

        <ChangelogButton />

        <NavSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {user ? <UserMenu user={user.user} /> : <SignedOutNav />}
      </div>
    </header>
  );
}
