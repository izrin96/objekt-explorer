import type { ChatMessage, ReplyQuote } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { ReactNode, RefObject } from "react";

import { CautionLine } from "@/features/chat/caution-line";
import { messageTime } from "@/features/chat/format";
import { canReply, quoteLabel, quoteText } from "@/features/chat/reply";
import { canUnsend } from "@/features/chat/thread-cache";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Bubble } from "./bubble";
import type { RunPosition } from "./bubble-run";
import { MessageActions } from "./message-actions";
import { MessageText } from "./message-text";
import { ObjektCardMessage } from "./objekt-card-message";
import { PostCardMessage } from "./post-card-message";

export function MessageItem({
  conversationId,
  message,
  name,
  collection,
  collections,
  offerCard,
  position,
  seen,
  hydrated,
  now,
  replyFocus,
  onReply,
  onQuote,
  onOpen,
}: {
  conversationId: number;
  message: ChatMessage;
  name: string;
  collection: ValidObjekt | undefined;
  collections: Readonly<Record<string, ValidObjekt | undefined>>;
  offerCard: ReactNode;
  position: RunPosition;
  /** the latest of the viewer's messages the partner has read */
  seen: boolean;
  hydrated: boolean;
  now: number;
  replyFocus: RefObject<HTMLElement | null>;
  /** null where the message box is hidden or replaced by a notice */
  onReply: ((message: ChatMessage) => void) | null;
  onQuote: (messageId: number) => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const { mine } = message;
  const replyable = onReply !== null && canReply(message);
  // the clock is the viewer's, so the window is read once the client renders
  const unsendable = hydrated && canUnsend(message, now);
  // the last of a run from one side shows its time; the others keep it for screen readers
  const showTime = position === "single" || position === "last";
  return (
    <li
      // a quote's jump lands here
      tabIndex={-1}
      data-message-id={message.id}
      className={cn(
        // an offer card takes the thread's width on a phone; text stays at 85%
        "focus-visible:ring-ring data-highlight:bg-accent flex flex-col gap-1 rounded-lg transition-colors duration-700 outline-none focus-visible:ring-2 motion-reduce:transition-none",
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
        <>
          {message.replyTo ? (
            <QuoteLine quote={message.replyTo} name={name} onJump={onQuote} />
          ) : null}
          {/* the menu sits on the bubble's inner side */}
          <div
            className={cn("group flex max-w-full items-center gap-1", !mine && "flex-row-reverse")}
          >
            {replyable || unsendable ? (
              <MessageActions
                conversationId={conversationId}
                message={message}
                unsendable={unsendable}
                replyFocus={replyFocus}
                onReply={replyable ? () => onReply(message) : null}
              />
            ) : null}
            <div className={cn("flex min-w-0 flex-col gap-1", mine ? "items-end" : "items-start")}>
              {message.card?.kind === "objekt" ? (
                <ObjektCardMessage card={message.card} collection={collection} onOpen={onOpen} />
              ) : null}
              {message.card?.kind === "post" ? (
                <PostCardMessage
                  view={message.card}
                  mine={mine}
                  collections={collections}
                  onOpen={onOpen}
                />
              ) : null}
              {message.body ? (
                <Bubble mine={mine} position={position}>
                  <MessageText text={message.body} />
                </Bubble>
              ) : null}
            </div>
          </div>
        </>
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

/** The message a reply answers, above its bubble: a jump to it, or plain text once it is gone. */
function QuoteLine({
  quote,
  name,
  onJump,
}: {
  quote: ReplyQuote;
  name: string;
  onJump: (messageId: number) => void;
}) {
  const className = cn(
    "text-muted-foreground border-border max-w-full truncate border-s-2 px-2 py-0.5 text-start text-xs",
    quote.state !== "shown" && "italic",
  );
  if (quote.state === "unavailable") return <p className={className}>{quoteText(quote)}</p>;
  return (
    <button
      type="button"
      aria-label={quoteLabel(quote, name)}
      onClick={() => onJump(quote.id)}
      className={cn(
        className,
        "hover:text-foreground focus-visible:ring-ring rounded-e-sm outline-none focus-visible:ring-2",
      )}
    >
      {quoteText(quote)}
    </button>
  );
}
