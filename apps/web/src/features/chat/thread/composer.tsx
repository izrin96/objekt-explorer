import {
  CardsThreeIcon,
  HandshakeIcon,
  type Icon,
  PaperPlaneRightIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  type ChatMessage,
  MESSAGE_MAX_LENGTH,
  messageLength,
  type ReplyQuote,
} from "@repo/api/schemas/chat";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AttachObjektDialog } from "@/features/chat/attach/attach-objekt-dialog";
import type { Attachment } from "@/features/chat/attachment";
import { refusalOf, refusalText } from "@/features/chat/format";
import { useStartGate } from "@/features/chat/message-button";
import { fetchNewer, invalidateChatLists } from "@/features/chat/queries";
import { currentQuote, quoteText } from "@/features/chat/reply";
import { SendingAs } from "@/features/link/shown-as";
import { useMediaQuery } from "@/hooks/use-media-query";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import {
  dropDraftSendId,
  putDraftCard,
  restoreDraft,
  setDraftBody,
  setDraftReply,
  beginSend,
  sentReplies,
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
  textarea,
  cached,
  empty: conversationEmpty,
  attachment,
  setAttachment,
  onSent,
  onOffer,
  onOpen,
}: {
  conversationId: number;
  name: string;
  /** the thread's, so Reply in a message's menu can hand focus here */
  textarea: RefObject<HTMLTextAreaElement | null>;
  /** a loaded message, so the reply line follows an unsend */
  cached: (messageId: number) => ChatMessage | undefined;
  /** the conversation has no message yet, so first lines are offered */
  empty: boolean;
  /** held by the thread, which words its empty state differently while a card is attached */
  attachment: Attachment | null;
  setAttachment: (attachment: Attachment | null) => void;
  onSent: () => void;
  /** opens the builder, which hands focus back to `finalFocus` when it closes */
  onOffer: (finalFocus: RefObject<HTMLElement | null>) => void;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const queryClient = useQueryClient();
  const { offerLink } = useStartGate();
  const body = useChatDraft((state) => state.drafts[conversationId]?.body ?? "");
  const reply = useChatDraft((state) => state.drafts[conversationId]?.reply ?? null);
  // a card handed over by a Message button is attached, then forgotten; also while this thread
  // is already open, as from the objekt drawer's Market tab
  const [attachOpen, setAttachOpen] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const detach = () => {
    setAttachment(null);
    dropDraftSendId(conversationId);
  };
  const [error, setError] = useState<string | null>(null);
  // over the per-minute limit the server names when it takes messages again
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);
  const counterId = useId();
  const errorId = useId();
  const replyId = useId();

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
        // `invalid_reply` too puts its reply back: no control here offers a target it refuses
        restoreDraft(id, {
          body: sentBody ?? "",
          clientId,
          reply: sentReplies.get(clientId) ?? null,
        });
        const card = sentCards.get(clientId);
        if (card) putDraftCard(id, { ...card }, true);
      },
      onSettled: (_data, _error, { clientId }) => {
        if (clientId === undefined) return;
        sentCards.delete(clientId);
        sentReplies.delete(clientId);
      },
    }),
  );

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (empty || over > 0 || send.isPending || blockedUntil !== null) return;
    const sentAttachment = attachment;
    // cleared at once so typing can go on; a failure puts it back
    const { body: sentBody, clientId, reply } = beginSend(conversationId, body);
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
        replyTo: reply?.id,
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

  const stopReplying = () => {
    setDraftReply(conversationId, null);
    textarea.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // an IME's Enter or Escape ends the composition, it does not send or stop a reply; Safari
    // ends the composition before this keydown, so only its keyCode 229 still tells
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === "Escape" && reply) {
      event.preventDefault();
      stopReplying();
      return;
    }
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submit();
  };

  const describedBy = [
    reply ? replyId : null,
    length >= COUNTER_FROM ? counterId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 border-t p-3">
      {reply ? (
        <ReplyLine
          id={replyId}
          quote={currentQuote(reply, cached(reply.id))}
          name={name}
          onStop={stopReplying}
        />
      ) : null}
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
        <AddToMessage
          buttonRef={addRef}
          onAttach={() => setAttachOpen(true)}
          onOffer={() => onOffer(addRef)}
        />
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
        finalFocus={addRef}
        onPick={(picked) => {
          setAttachment(picked);
          dropDraftSendId(conversationId);
        }}
      />
    </form>
  );
}

type AddChoice = { icon: Icon; label: string; description: string; run: () => void };

/**
 * One button for Attach objekt and Make offer: a menu from `md` up, where the conversation
 * list joins the thread, and a bottom sheet below it, with a line under each choice. What a
 * choice opens hands focus back to the button when it closes.
 */
function AddToMessage({
  buttonRef,
  onAttach,
  onOffer,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  onAttach: () => void;
  onOffer: () => void;
}) {
  const wide = useMediaQuery("(min-width: 48rem)");
  const [sheetOpen, setSheetOpen] = useState(false);
  // a choice opens its dialog once the sheet has closed and handed focus back, or the sheet's
  // focus return lands on Add behind the new dialog
  const chosen = useRef<(() => void) | null>(null);
  const choices: AddChoice[] = [
    {
      icon: CardsThreeIcon,
      label: m.chat_attach_title(),
      description: m.chat_add_attach_desc(),
      run: onAttach,
    },
    {
      icon: HandshakeIcon,
      label: m.offer_composer(),
      description: m.chat_add_offer_desc(),
      run: onOffer,
    },
  ];
  // the same height as Send, so the row lines up with a one-line message box
  const button = (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      aria-label={m.chat_add_to_message()}
      title={m.chat_add_to_message()}
      className="shrink-0"
    />
  );

  if (wide) {
    return (
      <Menu>
        <MenuTrigger render={button}>
          <PlusIcon />
        </MenuTrigger>
        <MenuPopup side="top" align="start">
          {choices.map(({ icon: ChoiceIcon, label, run }) => (
            <MenuItem key={label} onClick={run}>
              <ChoiceIcon />
              {label}
            </MenuItem>
          ))}
        </MenuPopup>
      </Menu>
    );
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        aria-label={m.chat_add_to_message()}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}
        className="shrink-0"
      >
        <PlusIcon />
      </Button>
      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOpenChangeComplete={(open) => {
          if (open) return;
          const run = chosen.current;
          chosen.current = null;
          run?.();
        }}
      >
        <SheetPopup side="bottom" finalFocus={buttonRef}>
          <SheetHeader>
            <SheetTitle className="font-display">{m.chat_add_to_message()}</SheetTitle>
          </SheetHeader>
          <SheetPanel className="flex flex-col gap-1 pt-0">
            {choices.map(({ icon: ChoiceIcon, label, description, run }) => (
              <Button
                key={label}
                variant="ghost"
                className="h-auto justify-start gap-3 py-3 text-start"
                onClick={() => {
                  chosen.current = run;
                  setSheetOpen(false);
                }}
              >
                <ChoiceIcon className="size-5" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-muted-foreground text-xs font-normal">{description}</span>
                </span>
              </Button>
            ))}
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </>
  );
}

function ReplyLine({
  id,
  quote,
  name,
  onStop,
}: {
  id: string;
  quote: ReplyQuote;
  name: string;
  onStop: () => void;
}) {
  return (
    <div className="border-border flex min-w-0 items-center gap-2 border-s-2 ps-2">
      <div id={id} className="flex min-w-0 flex-1 flex-col text-xs">
        <span className="font-medium">
          {quote.mine ? m.chat_replying_to_self() : m.chat_replying_to({ name })}
        </span>
        <span className={cn("text-muted-foreground truncate", quote.state !== "shown" && "italic")}>
          {quoteText(quote)}
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={m.chat_reply_stop()}
        onClick={onStop}
        className="shrink-0"
      >
        <XIcon />
      </Button>
    </div>
  );
}
