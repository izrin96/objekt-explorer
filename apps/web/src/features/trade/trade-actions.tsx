import type { CardInput, ChatTarget } from "@repo/api/schemas/chat";

import { MessageButton } from "@/features/chat/message-button";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import type { OfferRequest } from "@/features/offers/offer-builder";
import { m } from "@/paraglide/messages";

/** The viewer's own post shows no Message, and no note saying so. */
export type TradeContact =
  | {
      kind: "open";
      target: ChatTarget;
      card?: CardInput;
      offer?: Pick<OfferRequest, "suggestFor" | "focusList" | "focusWantList">;
    }
  | { kind: "own" }
  | { kind: "closed" };

/** Message, then Make offer as the primary button. `compact` makes Message icon-only. */
export function TradeActions({
  contact,
  name,
  compact = false,
}: {
  contact: TradeContact;
  name: string;
  compact?: boolean;
}) {
  if (contact.kind === "own") return null;
  if (contact.kind === "closed") {
    return <span className="text-muted-foreground text-sm">{m.trade_not_messageable()}</span>;
  }

  return (
    <>
      <MessageButton target={contact.target} card={contact.card} name={name} iconOnly={compact} />
      <MakeOfferButton
        variant="default"
        request={{ to: { target: contact.target }, name, ...contact.offer }}
      />
    </>
  );
}
