import { BellIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { UnreadDot } from "@/components/shared/unread-dot";
import { Button } from "@/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetPopup, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/paraglide/messages";
import { useUserSocketLive } from "@/stores/user-socket";

import { NotificationPanel } from "./notification-panel";
import { unreadCountOptions } from "./queries";

/** The bell polls while the tab's user socket is down; below `sm` it opens a sheet, not a popover. */
export function NotificationBell() {
  const live = useUserSocketLive((state) => state.live);
  const { data: unread = 0 } = useQuery(unreadCountOptions(live));
  const [open, setOpen] = useState(false);
  const wide = useMediaQuery("(min-width: 40rem)");
  // the popup itself, not its first button: that one is Mark all read
  const popupRef = useRef<HTMLDivElement>(null);

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        unread > 0
          ? m.notification_bell_label_unread({ count: unread })
          : m.notification_bell_label()
      }
      className="relative shrink-0"
    />
  );
  const icon = (
    <>
      <BellIcon />
      <UnreadDot count={unread} />
    </>
  );

  if (!wide) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={trigger}>{icon}</SheetTrigger>
        <SheetPopup
          side="bottom"
          showCloseButton={false}
          className="h-[calc(100dvh-(--spacing(12)))]"
        >
          <NotificationPanel variant="sheet" unread={unread} onNavigate={() => setOpen(false)} />
        </SheetPopup>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger}>{icon}</PopoverTrigger>
      <PopoverPopup
        ref={popupRef}
        initialFocus={popupRef}
        align="end"
        padding="none"
        className="w-[min(--spacing(96),calc(100vw-(--spacing(6))))]"
      >
        <NotificationPanel unread={unread} onNavigate={() => setOpen(false)} />
      </PopoverPopup>
    </Popover>
  );
}
