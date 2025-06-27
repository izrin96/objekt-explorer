"use client";

import { CSSProperties, PropsWithChildren } from "react";
import { Avatar } from "../ui";
import { useLiveSession } from "@/hooks/use-live-session";

export default function LiveFooter({ children }: PropsWithChildren) {
  const liveSession = useLiveSession();

  return (
    <div className="flex items-center absolute -bottom-[54px] w-full gap-2">
      <div className="grow min-w-0">
        <div className="flex gap-2 items-center">
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
            <span className="font-semibold truncate">{liveSession.title}</span>
            <span className="font-semibold text-sm truncate">
              {liveSession.channel.name}
            </span>
          </div>
        </div>
      </div>
      <div className="items-center gap-2 flex">{children}</div>
    </div>
  );
}
