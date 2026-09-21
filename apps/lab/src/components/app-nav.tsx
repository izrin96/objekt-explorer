import { CubeIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { MobileNav } from "@/components/mobile-nav";
import { NavSearch } from "@/components/nav-search";
import { statusDotClass, SystemStatus, useOverallStatus } from "@/components/system-status";
import { SignedOutNav, UserMenu } from "@/components/user-menu";
import { cn, containerClass } from "@/lib/utils";
import { useSession } from "@/store/session";

const NAV_LINKS = [
  { label: "Objekts", to: "/" },
  { label: "Market", to: "/market" },
  { label: "Activity", to: "/activity" },
  { label: "Lists", to: "/list" },
] as const;

export type NavLink = (typeof NAV_LINKS)[number];

/** Port of `.nav` from design/objekt-redesign-mockup.html */
export function AppNav() {
  // the nav owns which of its two surfaces is open, so the mobile sheet can
  // hand off to the search dialog without either one owning the other
  const [searchOpen, setSearchOpen] = useState(false);
  const signedIn = useSession((s) => s.signedIn);
  const overall = useOverallStatus();

  // z-30: above the cards' own layers and the floating select bar, below every
  // Base UI overlay (sheet / drawer / dialog / popover / menu at z-50, toasts at z-60)
  return (
    <header className="bg-background/88 sticky top-0 z-30 border-b backdrop-blur-lg">
      <div className={cn(containerClass, "flex h-13 items-center gap-3.5 px-5")}>
        <MobileNav links={NAV_LINKS} onSearch={() => setSearchOpen(true)} />

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
          <span>Objekt Tracker</span>
        </Link>

        <nav className="ml-1.5 hidden shrink-0 gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
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

        <NavSearch open={searchOpen} onOpenChange={setSearchOpen} />

        {signedIn ? <UserMenu /> : <SignedOutNav />}
      </div>
    </header>
  );
}
