import type { User } from "@repo/api/services/account/auth";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { BrandMark } from "@/components/layout/brand-mark";
import { ChangelogButton } from "@/components/layout/changelog";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useAlsoActive, useNavLinks } from "@/components/layout/nav-links";
import { NavSearch } from "@/components/layout/nav-search";
import { SystemStatus } from "@/components/layout/system-status";
import { SignedOutNav, UserMenu } from "@/components/layout/user-menu";
import { Group } from "@/components/ui/group";
import { MessagesIcon } from "@/features/chat/messages-icon";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { useUserSocket } from "@/features/notifications/use-user-socket";
import { useActivityReporter } from "@/features/presence/use-activity-reporter";
import { usePresencePoller } from "@/features/presence/use-presence-poller";
import { useCurrentUser } from "@/features/user/hooks";
import { SITE_NAME, cn, containerClass } from "@/lib/utils";

export function AppNav() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: user } = useCurrentUser();
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
          // the link fills the bar's height, so the ring sits on a shorter box
          className="font-display after:ring-ring relative flex shrink-0 items-center gap-2 self-stretch text-base font-bold tracking-tight whitespace-nowrap outline-none after:pointer-events-none after:absolute after:-inset-x-1.5 after:inset-y-2.5 after:rounded-lg focus-visible:after:ring-2"
        >
          <BrandMark />
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
              className="text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground focus-visible:ring-ring rounded-[7px] px-2.5 py-1.5 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-2"
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

/**
 * One socket, one presence poller and one activity reporter per tab: the bell and the messages
 * icon share the socket.
 */
function SignedInActions({ user }: { user: User }) {
  useUserSocket();
  usePresencePoller();
  useActivityReporter();
  return (
    <div className="flex shrink-0 items-center gap-1 pointer-coarse:gap-2">
      <MessagesIcon />
      <NotificationBell />
      <UserMenu user={user} />
    </div>
  );
}
