"use client";

import { UsersIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallStateHooks } from "@stream-io/video-react-sdk";

export default function ParticipantCounter() {
  const { useCallSession } = useCallStateHooks();
  const session = useCallSession();
  const cosmoUserCount = session?.participants_count_by_role.cosmo_user ?? 0;
  const anonymousUserCount = session?.anonymous_participant_count ?? 0;
  return (
    <span className="flex items-center gap-1 font-semibold text-sm">
      <UsersIcon size={16} />
      {cosmoUserCount + anonymousUserCount}
    </span>
  );
}
