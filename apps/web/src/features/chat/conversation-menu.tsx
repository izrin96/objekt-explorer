import {
  ArchiveIcon,
  BellIcon,
  BellSlashIcon,
  CheckIcon,
  DotsThreeIcon,
  FlagIcon,
  ProhibitIcon,
  TrayArrowUpIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ConversationRow } from "@repo/api/schemas/chat";

import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { useUnblock } from "@/features/moderation/actions";
import { useSafetyDialogs } from "@/features/moderation/safety-dialogs";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useConversationActions } from "./actions";
import { mutedLabel } from "./format";

const MUTES = [
  { until: "8h", label: m.chat_mute_8h },
  { until: "1w", label: m.chat_mute_1w },
  { until: "always", label: m.chat_mute_always },
] as const;

type ConversationState = Pick<ConversationRow, "id" | "request" | "archived" | "muted"> & {
  partner: { userId: string };
  /** known in a thread; a list row offers Block, which is harmless when already blocked */
  blockedByMe?: boolean;
};

export function ConversationMenu({
  conversation,
  name,
  className,
}: {
  conversation: ConversationState;
  name: string;
  className?: string;
}) {
  const { id, request, archived, muted, partner, blockedByMe = false } = conversation;
  const actions = useConversationActions(id);
  const unblock = useUnblock();
  const safety = useSafetyDialogs({ userId: partner.userId, name, conversationId: id });

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={m.chat_actions_label({ name })}
              className={cn("shrink-0", className)}
            />
          }
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-52">
          {request && !archived ? (
            <>
              <MenuItem onClick={() => actions.accept.mutate({ id })}>
                <CheckIcon />
                {m.chat_accept()}
              </MenuItem>
              <MenuItem onClick={() => actions.decline.mutate({ id })}>
                <XIcon />
                {m.chat_decline()}
              </MenuItem>
              <MenuSeparator />
            </>
          ) : null}

          <MenuGroup>
            <MenuGroupLabel>{muted ? mutedLabel(muted) : m.chat_mute()}</MenuGroupLabel>
            {muted ? (
              <MenuItem onClick={() => actions.mute.mutate({ id, until: null })}>
                <BellIcon />
                {m.chat_unmute()}
              </MenuItem>
            ) : (
              MUTES.map((mute) => (
                <MenuItem
                  key={mute.until}
                  onClick={() => actions.mute.mutate({ id, until: mute.until })}
                >
                  <BellSlashIcon />
                  {mute.label()}
                </MenuItem>
              ))
            )}
          </MenuGroup>

          {request && !archived ? null : (
            <>
              <MenuSeparator />
              {archived ? (
                <MenuItem onClick={() => actions.unarchive.mutate({ id })}>
                  <TrayArrowUpIcon />
                  {m.chat_unarchive()}
                </MenuItem>
              ) : (
                <MenuItem onClick={() => actions.archive.mutate({ id })}>
                  <ArchiveIcon />
                  {m.chat_archive()}
                </MenuItem>
              )}
            </>
          )}
          <MenuSeparator />
          <MenuItem onClick={safety.openReport}>
            <FlagIcon />
            {m.mod_report()}
          </MenuItem>
          {blockedByMe ? (
            <MenuItem onClick={() => unblock.mutate({ userId: partner.userId })}>
              <ProhibitIcon />
              {m.mod_unblock()}
            </MenuItem>
          ) : (
            <MenuItem variant="destructive" onClick={safety.openBlock}>
              <ProhibitIcon />
              {m.mod_block()}
            </MenuItem>
          )}
        </MenuPopup>
      </Menu>
      {safety.dialogs}
    </>
  );
}
