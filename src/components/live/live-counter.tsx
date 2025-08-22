"use client";

import { UsersIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallStateHooks } from "@stream-io/video-react-sdk";

export default function ParticipantCounter() {
  const { useParticipantCount } = useCallStateHooks();
  const count = useParticipantCount();
  return (
    <span className="flex items-center gap-1 font-semibold text-red-400 text-sm tabular-nums">
      <UsersIcon size={16} />
      {count}
    </span>
  );
}
