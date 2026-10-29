import type { ComponentProps } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { TONE_SOLID } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { usePresenceStatus } from "./use-presence-status";

/**
 * `PersonAvatar` with a green dot while the person is online for this viewer, an amber crescent
 * while idle, so the two differ by shape as well as colour. No
 * `userId` (the viewer's own row, an unlinked profile) never shows one. `announce={false}` where
 * the surrounding text already says "Online" or "Idle".
 */
export function OnlineAvatar({
  userId,
  announce = true,
  ...avatar
}: ComponentProps<typeof PersonAvatar> & { userId: string | undefined; announce?: boolean }) {
  const status = usePresenceStatus(userId);
  return (
    <span className="relative inline-flex shrink-0">
      <PersonAvatar {...avatar} />
      {status ? (
        <span
          aria-hidden={announce ? undefined : true}
          // centred on the circle's edge at 45°, (1 - 1/√2) / 2 of the box in from each side, so it
          // hugs the avatar at any size instead of the square's empty corner
          className={cn(
            "ring-background absolute end-[14.6%] bottom-[14.6%] size-2.5 translate-x-1/2 translate-y-1/2 rounded-full ring-2 rtl:-translate-x-1/2",
            status === "idle" ? [TONE_SOLID.warning, "overflow-hidden"] : TONE_SOLID.success,
          )}
        >
          {status === "idle" ? (
            // the crescent's bite, in the ring's colour
            <span className="bg-background absolute -start-1/8 -top-1/8 size-3/4 rounded-full" />
          ) : null}
          {announce ? (
            <span className="sr-only">
              {status === "idle" ? m.presence_idle() : m.presence_online()}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
