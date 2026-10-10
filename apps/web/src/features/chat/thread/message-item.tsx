import type { ChatMessage } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode } from "react";

import { CautionLine } from "@/features/chat/caution-line";
import { messageTime } from "@/features/chat/format";
import { canUnsend } from "@/features/chat/thread-cache";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Bubble } from "./bubble";
import type { RunPosition } from "./bubble-run";
import { MessageActions } from "./message-actions";
import { ObjektCardMessage } from "./objekt-card-message";

export function MessageItem({
  conversationId,
  message,
  name,
  collection,
  offerCard,
  position,
  seen,
  hydrated,
  now,
  onOpen,
}: {
  conversationId: number;
  message: ChatMessage;
  name: string;
  collection: ValidObjekt | undefined;
  offerCard: ReactNode;
  position: RunPosition;
  /** the latest of the viewer's messages the partner has read */
  seen: boolean;
  hydrated: boolean;
  now: number;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { mine } = message;
  // the last of a run from one side shows its time; the others keep it for screen readers
  const showTime = position === "single" || position === "last";
  return (
    <li
      className={cn(
        // an offer card takes the thread's width on a phone; text stays at 85%
        "flex flex-col gap-1",
        offerCard ? "max-w-full" : "max-w-[85%]",
        mine ? "items-end self-end" : "items-start self-start",
        showTime && "mb-2",
      )}
    >
      <span className="sr-only">{mine ? m.chat_sender_you() : m.chat_sender_name({ name })}</span>
      {offerCard}
      {message.unsent ? (
        <Bubble mine={mine} position={position} unsent>
          {m.chat_unsent()}
        </Bubble>
      ) : (
        <div className="group flex max-w-full items-center gap-1">
          {/* the clock is the viewer's, so the window is read once the client renders */}
          {hydrated && canUnsend(message, now) ? (
            <MessageActions conversationId={conversationId} message={message} />
          ) : null}
          <div className={cn("flex min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
            {message.card ? (
              <ObjektCardMessage card={message.card} collection={collection} onOpen={onOpen} />
            ) : null}
            {message.body ? (
              <Bubble mine={mine} position={position}>
                {message.body}
              </Bubble>
            ) : null}
          </div>
        </div>
      )}
      {message.caution && message.caution.length > 0 ? (
        <CautionLine categories={message.caution} />
      ) : null}
      <time
        dateTime={message.createdAt}
        className={showTime ? "text-muted-foreground px-1 text-xs tabular-nums" : "sr-only"}
      >
        {hydrated ? messageTime(message.createdAt) : null}
      </time>
      {seen ? <span className="text-muted-foreground px-1 text-xs">{m.chat_seen()}</span> : null}
    </li>
  );
}
