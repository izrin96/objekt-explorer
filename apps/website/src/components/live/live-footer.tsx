import type { CSSProperties, PropsWithChildren } from "react";

import { useLiveSession } from "@/hooks/use-live-session";

import { Avatar } from "../intentui/avatar-custom";

type LiveFooterProps = PropsWithChildren;

export default function LiveFooter({ children }: LiveFooterProps) {
  const liveSession = useLiveSession();

  return (
    <div className="flex w-full items-center gap-2">
      <div className="min-w-0 grow">
        <div className="flex items-center gap-2">
          <Avatar
            style={
              {
                "--color": liveSession.channel.primaryColorHex,
              } as CSSProperties
            }
            className="outline-3 outline-(--color)"
            src={liveSession.channel.profileImageUrl}
            size="lg"
          />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-semibold">{liveSession.title}</span>
            <span className="truncate text-sm font-semibold">{liveSession.channel.name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
