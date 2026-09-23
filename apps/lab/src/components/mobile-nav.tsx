import { CubeIcon, ListIcon, MagnifyingGlassIcon, SignInIcon } from "@phosphor-icons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";

import type { NavLink } from "@/components/app-nav";
import { SystemStatus } from "@/components/system-status";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/store/session";

/**
 * Below `md` the nav links are hidden, so they live here instead: a left
 * Sheet holding the same four router Links plus the search entry, which hands
 * off to the nav's ⌘K dialog. Closes on navigation because each Link sets
 * `open` to false on click — Base UI's Dialog has no router awareness.
 */
export function MobileNav({
  links,
  onSearch,
}: {
  links: readonly NavLink[];
  onSearch: () => void;
}) {
  const [open, setOpen] = useState(false);
  const signedIn = useSession((s) => s.signedIn);
  const href = useLocation({ select: (s) => s.href });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open menu"
            className="-ml-1.5 md:hidden"
          />
        }
      >
        <ListIcon />
      </SheetTrigger>
      <SheetPopup side="left" className="flex max-w-72 flex-col">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2 text-[15px]">
            <span className="bg-foreground text-background grid size-6 shrink-0 place-items-center rounded-[7px]">
              <CubeIcon weight="bold" className="size-3.5" />
            </span>
            Objekt Tracker
          </SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-1 flex-col gap-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSearch();
            }}
            className="bg-popover text-muted-foreground hover:border-foreground/30 mb-1.5 flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm"
          >
            <MagnifyingGlassIcon className="size-4 shrink-0" />
            <span className="truncate">Search user</span>
            <Kbd className="ml-auto shrink-0">⌘K</Kbd>
          </button>

          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground rounded-lg px-3 py-2 text-sm font-medium"
            >
              {l.label}
            </Link>
          ))}

          {/* the nav's status button has nowhere to sit below `md`, so it lands here */}
          <SystemStatus label="System status" className="mt-1.5 justify-start" />

          {/* same identity slot as the nav: the account, or a way into one.
              A real Separator rather than a `border-t` on the block, for the
              same reason the avatar menu uses MenuSeparator */}
          <Separator className="mt-auto" />
          <div className="pt-3">
            {signedIn ? (
              <div className="flex min-w-0 items-center gap-2.5 px-1">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-linear-to-br from-[#d8b4a0] to-[#8c5a4a]" />
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  {/* display name only — the app has no username */}
                  <span className="truncate text-sm font-medium">Shah</span>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                render={<Link to="/login" search={{ redirect: href }} />}
                onClick={() => setOpen(false)}
              >
                <SignInIcon />
                Sign in
              </Button>
            )}
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
