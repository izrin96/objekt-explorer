import type { ComponentProps } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { TONE_SOLID } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useOnline } from "./use-online";

/**
 * `PersonAvatar` with a dot while the person is online for this viewer. No `userId` (the
 * viewer's own row, an unlinked profile) never shows one. `announce={false}` where the
 * surrounding text already says "Online".
 */
export function OnlineAvatar({
  userId,
  announce = true,
  ...avatar
}: ComponentProps<typeof PersonAvatar> & { userId: string | undefined; announce?: boolean }) {
  const online = useOnline(userId);
  return (
    <span className="relative inline-flex shrink-0">
      <PersonAvatar {...avatar} />
      {online ? (
        <span
          aria-hidden={announce ? undefined : true}
          // centred on the circle's edge at 45°, (1 - 1/√2) / 2 of the box in from each side, so it
          // hugs the avatar at any size instead of the square's empty corner
          className={cn(
            "ring-background absolute end-[14.6%] bottom-[14.6%] size-2.5 translate-x-1/2 translate-y-1/2 rounded-full ring-2 rtl:-translate-x-1/2",
            TONE_SOLID.success,
          )}
        >
          {announce ? <span className="sr-only">{m.presence_online()}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
