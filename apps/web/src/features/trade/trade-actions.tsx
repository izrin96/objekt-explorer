import { HandshakeIcon } from "@phosphor-icons/react";
import type { CardInput, ChatTarget } from "@repo/api/schemas/chat";
import { useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { MessageButton } from "@/features/chat/message-button";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import type { OfferStart } from "@/features/offers/offer-link";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** The viewer's own post shows no Message, and no note saying so. */
export type TradeContact =
  | { kind: "open"; target: ChatTarget; card?: CardInput }
  | { kind: "own" }
  | { kind: "closed" };

/** Message (icon-only), then Make offer as the primary button. */
export function TradeActions({
  contact,
  name,
  handle,
  offerClassName,
  matches,
}: {
  contact: TradeContact;
  name: string;
  /** any handle of theirs, which the offer page lives under; none, Make offer shows disabled */
  handle: string | null;
  /** Make offer opens with these swap matches added */
  matches?: OfferStart["matches"];
  /** e.g. `flex-1`, where Make offer fills the row */
  offerClassName?: string;
}) {
  if (contact.kind === "own") return null;
  if (contact.kind === "closed") {
    return <span className="text-muted-foreground text-sm">{m.trade_not_messageable()}</span>;
  }

  return (
    <>
      <MessageButton target={contact.target} card={contact.card} name={name} iconOnly />
      {contact.target.kind !== "list" ? null : handle ? (
        <MakeOfferButton
          variant="default"
          className={offerClassName}
          start={{ handle, to: { list: contact.target.slug }, matches }}
        />
      ) : (
        <NoProfileOffer name={name} variant="default" className={offerClassName} />
      )}
    </>
  );
}

/**
 * Make offer for a person with no linked Cosmo profile, who has no offer page. Focusable while
 * disabled, so focusing it reads the reason and activating it says it.
 */
export function NoProfileOffer({
  name,
  label = m.offer_make(),
  variant = "outline",
  size = "sm",
  className,
}: {
  name: string;
  label?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  className?: string;
}) {
  const reasonId = useId();
  // one reason toast at a time, however often the button is pressed
  const reasonToast = useRef<string | null>(null);
  const reason = m.trade_offer_no_profile({ name });
  return (
    <>
      <Button
        variant={variant}
        size={size}
        aria-disabled
        aria-describedby={reasonId}
        className={cn(
          "aria-disabled:cursor-default aria-disabled:opacity-64",
          variant === "outline" &&
            "aria-disabled:hover:bg-popover dark:aria-disabled:hover:bg-input/32",
          variant === "default" && "aria-disabled:hover:bg-primary",
          className,
        )}
        onClick={() => {
          if (reasonToast.current) toastManager.close(reasonToast.current);
          reasonToast.current = toastManager.add({ type: "info", title: reason });
        }}
      >
        <HandshakeIcon />
        <span>{label}</span>
      </Button>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
}
