import { CardsThreeIcon, HandshakeIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { MESSAGE_MAX_LENGTH, messageLength } from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachObjektDialog } from "@/features/chat/attach/attach-objekt-dialog";
import type { Attachment } from "@/features/chat/attachment";
import { refusalOf, refusalText } from "@/features/chat/format";
import { useStartGate } from "@/features/chat/message-button";
import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { SendingAs } from "@/features/link/shown-as";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  dropDraftSendId,
  putDraftCard,
  restoreDraft,
  setDraftBody,
  beginSend,
  useChatDraft,
} from "@/stores/chat-draft";

import { AttachmentChip } from "./composer-attachment";
import { firstLineSuggestions } from "./suggestions";
import { useTypingPing } from "./use-typing-ping";

/** The counter shows from here, so it never sits there for an ordinary message. */
const COUNTER_FROM = MESSAGE_MAX_LENGTH - 200;

/** The card of each send in flight, by send id, for a failure to put back after the thread unmounted. */
const sentCards = new Map<string, Attachment>();

export function Composer({
  conversationId,
  name,
  empty: conversationEmpty,
  attachment,
  setAttachment,
  onSent,
  onOffer,
  onOpen,
}: {
  conversationId: number;
  name: string;
  /** the conversation has no message yet, so first lines are offered */
  empty: boolean;
  /** held by the thread, which words its empty state differently while a card is attached */
  attachment: Attachment | null;
  setAttachment: (attachment: Attachment | null) => void;
  onSent: () => void;
  onOffer: () => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const queryClient = useQueryClient();
  const { offerLink } = useStartGate();
  const body = useChatDraft((state) => state.drafts[conversationId]?.body ?? "");
  // a card handed over by a Message button is attached, then forgotten; also while this thread
  // is already open, as from the objekt drawer's Market tab
  const [attachOpen, setAttachOpen] = useState(false);
  const detach = () => {
    setAttachment(null);
    dropDraftSendId(conversationId);
  };
  const [error, setError] = useState<string | null>(null);
  // over the per-minute limit the server names when it takes messages again
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const counterId = useId();
  const errorId = useId();

  useEffect(() => {
    if (blockedUntil === null) return;
    const timer = setTimeout(
      () => {
        setBlockedUntil(null);
        setError(null);
      },
      Math.max(0, blockedUntil - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [blockedUntil]);

  // at most one "typing" ping per interval; the server decides whether the partner sees it
  const pingTyping = useTypingPing(conversationId);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const length = messageLength(body.trim());
  const over = length - MESSAGE_MAX_LENGTH;
  const empty = length === 0 && attachment === null;

  const send = useMutation(
    orpc.chat.send.mutationOptions({
      // offline, a send fails at once and puts the text back, rather than waiting for a connection
      networkMode: "always",
      // reads everything after the newest message held rather than appending the sent one:
      // a reply that landed just before it, whose nudge is still on the way, would otherwise
      // sit below the new newest id and never be fetched
      onSuccess: async () => {
        onSent();
        await Promise.all([
          fetchNewer(queryClient, conversationId),
          invalidateChatLists(queryClient),
        ]);
      },
      // here rather than per call, so a send that fails after the user left still restores
      onError: (_error, { conversationId: id, body: sentBody, clientId }) => {
        if (clientId === undefined) return;
        restoreDraft(id, { body: sentBody ?? "", clientId });
        const card = sentCards.get(clientId);
        if (card) putDraftCard(id, { ...card }, true);
      },
      onSettled: (_data, _error, { clientId }) => {
        if (clientId !== undefined) sentCards.delete(clientId);
      },
    }),
  );

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (empty || over > 0 || send.isPending || blockedUntil !== null) return;
    const sentAttachment = attachment;
    // cleared at once so typing can go on; a failure puts it back
    const { body: sentBody, clientId } = beginSend(conversationId, body);
    if (sentAttachment) sentCards.set(clientId, sentAttachment);
    setAttachment(null);
    setError(null);
    textarea.current?.focus();
    send.mutate(
      {
        conversationId,
        body: sentBody.trim() === "" ? undefined : sentBody,
        card: sentAttachment?.input,
        clientId,
      },
      {
        onError: (failure) => {
          const refusal = refusalOf(failure);
          if (refusal?.reason === "no_address") {
            offerLink();
            return;
          }
          if (refusal?.reason === "message_limit" && refusal.retryAt) {
            setBlockedUntil(new Date(refusal.retryAt).getTime());
          }
          setError(
            refusal
              ? refusalText(refusal)
              : navigator.onLine
                ? m.chat_send_error()
                : m.chat_send_offline(),
          );
        },
      },
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // an IME's Enter confirms the composition, it does not send; Safari ends the composition
    // before this keydown, so only its keyCode 229 still tells
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      return;
    }
    event.preventDefault();
    submit();
  };

  const describedBy = [length >= COUNTER_FROM ? counterId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t p-3">
      {attachment ? (
        <AttachmentChip
          attachment={attachment}
          onOpen={onOpen}
          onRemove={() => {
            detach();
            textarea.current?.focus();
          }}
          onPickObjekts={() => {
            detach();
            setAttachOpen(true);
          }}
        />
      ) : null}

      {conversationEmpty && body === "" ? (
        <div
          role="group"
          aria-label={m.chat_suggestions_label()}
          className="flex flex-wrap gap-1.5"
        >
          {firstLineSuggestions(attachment).map((suggestion) => (
            <Button
              key={suggestion()}
              variant="outline"
              size="xs"
              className="rounded-full before:rounded-full"
              onClick={() => {
                setDraftBody(conversationId, suggestion());
                textarea.current?.focus();
              }}
            >
              {suggestion()}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="@container flex items-end gap-2">
        {/* the same height as Send, so all three line up with a one-line message box */}
        <Button
          variant="ghost"
          aria-label={m.chat_attach_title()}
          title={m.chat_attach_title()}
          onClick={() => setAttachOpen(true)}
          className="shrink-0"
        >
          <CardsThreeIcon />
          <span className="hidden @lg:inline">{m.chat_attach_title()}</span>
        </Button>
        <Button
          variant="ghost"
          aria-label={m.offer_composer()}
          title={m.offer_composer()}
          onClick={onOffer}
          className="shrink-0"
        >
          <HandshakeIcon />
          <span className="hidden @lg:inline">{m.offer_composer()}</span>
        </Button>
        <Textarea
          ref={textarea}
          value={body}
          onChange={(event) => {
            setDraftBody(conversationId, event.target.value);
            pingTyping(event.target.value);
          }}
          onKeyDown={onKeyDown}
          aria-label={m.chat_composer_label({ name })}
          aria-invalid={over > 0 || undefined}
          aria-describedby={describedBy || undefined}
          placeholder={m.chat_composer_placeholder()}
          rows={1}
          className="min-w-0 flex-1 *:data-[slot=textarea]:max-h-40 *:data-[slot=textarea]:min-h-9 *:data-[slot=textarea]:resize-none sm:*:data-[slot=textarea]:min-h-8"
        />
        <Button
          type="submit"
          size="icon"
          aria-label={m.chat_send()}
          disabled={empty || over > 0 || blockedUntil !== null}
          loading={send.isPending}
          // keeps focus, and a phone's keyboard, in the message box
          onPointerDown={(event) => event.preventDefault()}
          className="shrink-0"
        >
          <PaperPlaneRightIcon />
        </Button>
      </div>

      <SendingAs />

      {/* always in the tree, so a refusal is announced when its text arrives */}
      <p
        id={errorId}
        role="alert"
        className="text-destructive-foreground text-xs text-pretty empty:hidden"
      >
        {error}
      </p>
      {length >= COUNTER_FROM ? (
        <p
          id={counterId}
          className={cn(
            "self-end font-mono text-xs tabular-nums",
            over > 0 ? "text-destructive-foreground" : "text-muted-foreground",
          )}
        >
          {over > 0
            ? m.chat_too_long({ count: over.toLocaleString() })
            : m.chat_counter({
                count: length.toLocaleString(),
                max: MESSAGE_MAX_LENGTH.toLocaleString(),
              })}
        </p>
      ) : null}

      <AttachObjektDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        onPick={(picked) => {
          setAttachment(picked);
          dropDraftSendId(conversationId);
        }}
      />
    </form>
  );
}
