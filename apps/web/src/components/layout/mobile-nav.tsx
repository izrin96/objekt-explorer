import { CubeIcon, ListIcon, NoteIcon, SignInIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { NavLink } from "@/components/layout/app-nav";
import { ChangelogDialog } from "@/components/layout/changelog";
import { SystemStatus } from "@/components/layout/system-status";
import { UserAvatar, useSignInSearch } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
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
import { useCurrentUser } from "@/features/user/hooks";
import { SITE_NAME } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * Below `md` the nav links live here instead: a left Sheet holding the same
 * links plus the changelog, which the bar has no room for. Each Link closes
 * the sheet on click — Base UI's Dialog has no router awareness.
 */
export function MobileNav({ links }: { links: readonly NavLink[] }) {
  const [open, setOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const search = useSignInSearch();

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={m.nav_open_menu()}
              className="-ml-1.5 md:hidden"
            />
          }
        >
          <ListIcon />
        </SheetTrigger>
        <SheetPopup side="left" className="flex max-w-72 flex-col">
          <SheetHeader>
            <SheetTitle className="font-display flex items-center gap-2 text-base">
              <span className="bg-foreground text-background grid size-6 shrink-0 place-items-center rounded-[7px]">
                <CubeIcon weight="bold" className="size-3.5" />
              </span>
              {SITE_NAME}
            </SheetTitle>
            <SheetDescription className="sr-only">{m.nav_navigation()}</SheetDescription>
          </SheetHeader>
          <SheetPanel className="flex flex-1 flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.key}
                to={l.to}
                activeOptions={{ exact: l.exact }}
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground rounded-lg px-3 py-2 text-sm font-medium"
              >
                {l.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setChangelogOpen(true);
              }}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium"
            >
              <NoteIcon className="size-4 shrink-0" />
              {m.common_changelog()}
            </button>

            {/* the nav's status button has nowhere to sit below `md`, so it lands here */}
            <SystemStatus label={m.nav_system_status()} className="mt-1.5 justify-start" />

            <Separator className="mt-auto" />
            <div className="pt-3">
              {user ? (
                <div className="flex min-w-0 items-center gap-2.5 px-1">
                  <UserAvatar user={user.user} className="size-8" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{user.user.name}</span>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  render={<Link to="/login" search={search} />}
                  onClick={() => setOpen(false)}
                >
                  <SignInIcon />
                  {m.nav_sign_in()}
                </Button>
              )}
            </div>
          </SheetPanel>
        </SheetPopup>
      </Sheet>
      {/* outside the sheet, so closing the sheet does not take the dialog with it */}
      <ChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </>
  );
}
