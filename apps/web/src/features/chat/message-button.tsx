import { ChatCircleIcon } from "@phosphor-icons/react";
import type { CardInput, ChatTarget } from "@repo/api/schemas/chat";

import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import { useStartConversation } from "./use-start-conversation";

/**
 * Opens the conversation with the target's account, with `card` attached to send. The
 * caller decides whether to show it at all (`messageable`, and never on the viewer's own).
 * `name` makes an icon-only button say whom it messages.
 */
export function MessageButton({
  target,
  card,
  name,
  iconOnly = false,
}: {
  target: ChatTarget;
  card?: CardInput;
  name?: string;
  iconOnly?: boolean;
}) {
  const { start, pending } = useStartConversation();
  const label = name ? m.chat_message_name({ name }) : m.chat_message();

  return (
    <Button
      variant="outline"
      size={iconOnly ? "icon-sm" : "sm"}
      aria-label={name ? label : undefined}
      title={iconOnly ? label : undefined}
      loading={pending}
      onClick={() => start(target, card)}
    >
      <ChatCircleIcon />
      {iconOnly ? null : <span>{m.chat_message()}</span>}
    </Button>
  );
}
