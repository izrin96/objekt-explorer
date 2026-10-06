import { CardsThreeIcon, PaperPlaneRightIcon, XIcon } from "@phosphor-icons/react";
import { MESSAGE_MAX_LENGTH, messageLength } from "@repo/api/schemas/chat";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, type KeyboardEvent, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type Attachment, AttachObjektDialog } from "./attach-objekt-dialog";
import { refusalOf, refusalText } from "./format";
import { collectionName } from "./objekt-card-message";
import { fetchNewer, invalidateChatLists } from "./queries";

/** The counter shows from here, so it never sits there for an ordinary message. */
const COUNTER_FROM = MESSAGE_MAX_LENGTH - 200;

export function Composer({
  conversationId,
  name,
  onSent,
}: {
  conversationId: number;
  name: string;
  onSent: () => void;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
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

  const length = messageLength(body.trim());
  const over = length - MESSAGE_MAX_LENGTH;
  const empty = length === 0 && attachment === null;

  const send = useMutation(
    orpc.chat.send.mutationOptions({
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
    }),
  );

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (empty || over > 0 || send.isPending || blockedUntil !== null) return;
    const sentBody = body;
    const sentAttachment = attachment;
    // cleared at once so typing can go on; a refusal puts it back
    setBody("");
    setAttachment(null);
    setError(null);
    send.mutate(
      {
        conversationId,
        body: sentBody.trim() === "" ? undefined : sentBody,
        card: sentAttachment?.input,
      },
      {
        onError: (failure) => {
          // anything typed since stays, after the text that failed
          setBody((current) => (current === "" ? sentBody : `${sentBody}\n${current}`));
          setAttachment((current) => current ?? sentAttachment);
          const refusal = refusalOf(failure);
          if (refusal?.reason === "message_limit" && refusal.retryAt) {
            setBlockedUntil(new Date(refusal.retryAt).getTime());
          }
          setError(refusal ? refusalText(refusal) : m.chat_send_error());
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
        <div className="bg-secondary/60 flex items-center gap-2 self-start rounded-lg border py-1 ps-1 pe-1">
          <img
            src={attachment.objekt.thumbnailImage}
            alt=""
            className="h-10 w-7 shrink-0 rounded object-cover"
          />
          <span className="min-w-0 text-sm">
            <span className="font-medium">
              {collectionName(attachment.objekt.slug, attachment.objekt)}
            </span>
            {attachment.listName ? (
              <span className="text-muted-foreground"> · {attachment.listName}</span>
            ) : null}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.chat_attach_remove()}
            onClick={() => setAttachment(null)}
          >
            <XIcon />
          </Button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.chat_attach_title()}
          title={m.chat_attach_title()}
          onClick={() => setAttachOpen(true)}
          className="shrink-0"
        >
          <CardsThreeIcon />
        </Button>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label={m.chat_composer_label({ name })}
          aria-invalid={over > 0 || undefined}
          aria-describedby={describedBy || undefined}
          placeholder={m.chat_composer_placeholder()}
          rows={1}
          className="min-w-0 flex-1 *:data-[slot=textarea]:max-h-40 *:data-[slot=textarea]:min-h-9 sm:*:data-[slot=textarea]:min-h-8"
        />
        <Button
          type="submit"
          size="icon"
          aria-label={m.chat_send()}
          disabled={empty || over > 0 || blockedUntil !== null}
          loading={send.isPending}
          className="shrink-0"
        >
          <PaperPlaneRightIcon />
        </Button>
      </div>

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

      <AttachObjektDialog open={attachOpen} onOpenChange={setAttachOpen} onPick={setAttachment} />
    </form>
  );
}
