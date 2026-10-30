import { MESSAGE_MAX_LENGTH, messageLength } from "@repo/api/schemas/chat";

import type { Attachment } from "@/features/chat/attachment";
import type { DraftReply } from "@/stores/chat-draft";

/** The counter shows from here, so it never sits there for an ordinary message. */
export const COUNTER_FROM = MESSAGE_MAX_LENGTH - 200;

/** What the message box and Send show: the trimmed length in code points, as the server counts. */
export function boxCheck(body: string, hasCard: boolean, blocked: boolean) {
  const length = messageLength(body.trim());
  const over = Math.max(0, length - MESSAGE_MAX_LENGTH);
  const empty = length === 0 && !hasCard;
  return {
    length,
    over,
    empty,
    counter: length >= COUNTER_FROM,
    ready: !empty && over === 0 && !blocked,
  };
}

/**
 * What a keydown asks for. An IME's Enter or Escape ends the composition, it does not send or stop
 * a reply; Safari ends the composition before this keydown, so only its keyCode 229 still tells.
 */
export function keyAction(
  k: { key: string; shiftKey: boolean; isComposing: boolean; keyCode: number },
  replying: boolean,
): "send" | "stop-reply" | null {
  if (k.isComposing || k.keyCode === 229) return null;
  if (k.key === "Escape" && replying) return "stop-reply";
  if (k.key === "Enter" && !k.shiftKey) return "send";
  return null;
}

/** The send's input: a blank body is left out, a body with text goes untrimmed. */
export function sendInput(
  conversationId: number,
  sent: { body: string; clientId: string; reply: DraftReply | null },
  card: Attachment | null,
) {
  return {
    conversationId,
    body: sent.body.trim() === "" ? undefined : sent.body,
    card: card?.input,
    clientId: sent.clientId,
    replyTo: sent.reply?.id,
  };
}
