import type { CardInput, ChatTarget } from "@repo/api/schemas/chat";

import { MessageButton } from "@/features/chat/message-button";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import type { OfferStart } from "@/features/offers/offer-link";
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
  /** any handle of theirs, which the offer page lives under; none, no Make offer */
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
      {handle && contact.target.kind === "list" ? (
        <MakeOfferButton
          variant="default"
          className={offerClassName}
          start={{ handle, to: { list: contact.target.slug }, matches }}
        />
      ) : null}
    </>
  );
}
