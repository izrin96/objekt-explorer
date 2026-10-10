import { ProhibitIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { useConversationActions } from "@/features/chat/actions";
import { untilLabel } from "@/features/chat/format";
import { useUnblock } from "@/features/moderation/actions";
import { m } from "@/paraglide/messages";

export function MuteNotice({
  notice,
  hydrated,
}: {
  notice: { reason: string; until: string | null };
  hydrated: boolean;
}) {
  return (
    <div role="status" className="bg-secondary/60 flex flex-col gap-1 border-t px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <ProhibitIcon aria-hidden className="size-4 shrink-0" />
        {/* the end date is in the viewer's zone, unknown to the server render */}
        {notice.until && hydrated
          ? m.chat_refused_muted({ time: untilLabel(notice.until) })
          : m.chat_refused_muted_always()}
      </p>
      <p className="text-muted-foreground text-sm text-pretty break-words">
        {m.mod_mute_reason({ reason: notice.reason })}
      </p>
    </div>
  );
}

export function BlockedNotice({ userId, name }: { userId: string; name: string }) {
  const unblock = useUnblock();
  return (
    <div className="bg-secondary/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3">
      <p className="text-sm text-pretty">{m.mod_blocked_notice({ name })}</p>
      <Button
        variant="outline"
        size="sm"
        loading={unblock.isPending}
        onClick={() => unblock.mutate({ userId })}
      >
        {m.mod_unblock()}
      </Button>
    </div>
  );
}

export function RequestBar({ id, name }: { id: number; name: string }) {
  const actions = useConversationActions(id);
  return (
    <div className="bg-secondary/60 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3">
      <p className="text-sm text-pretty">{m.chat_request_hint({ name })}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          loading={actions.decline.isPending}
          onClick={() => actions.decline.mutate({ id })}
        >
          {m.chat_decline()}
        </Button>
        <Button
          size="sm"
          loading={actions.accept.isPending}
          onClick={() => actions.accept.mutate({ id })}
        >
          {m.chat_accept()}
        </Button>
      </div>
    </div>
  );
}
