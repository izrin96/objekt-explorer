"use client";

import type { CSSProperties, PropsWithChildren } from "react";
import { useLiveSession } from "@/hooks/use-live-session";
import { Avatar } from "../ui";

export default function LiveFooter({ children }: PropsWithChildren) {
  const liveSession = useLiveSession();

  return (
    <div className="-bottom-[54px] absolute flex w-full items-center gap-2">
      <div className="min-w-0 grow">
        <div className="flex items-center gap-2">
          <Avatar
            style={
              {
                "--color": liveSession.channel.primaryColorHex,
              } as CSSProperties
            }
            className="outline-(--color) outline-3"
            src={liveSession.channel.profileImageUrl}
            size="lg"
          />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate font-semibold">{liveSession.title}</span>
            <span className="truncate font-semibold text-sm">{liveSession.channel.name}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
