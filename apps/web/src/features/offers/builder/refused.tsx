import { LinkIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { type OfferRefusalInfo, offerRefusalText } from "@/features/offers/refusal";
import { m } from "@/paraglide/messages";

import { BuilderBody } from "./layout";

/** Reads like a refused Message: nothing can be sent, so the only way out is leaving. */
export function BuilderRefused({
  refusal,
  status,
  onLeave,
}: {
  refusal: OfferRefusalInfo;
  /** whether the caller draws a status region above the sides */
  status: boolean;
  onLeave: () => void;
}) {
  return (
    <BuilderBody
      status={status}
      sides={
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-pretty">
            {offerRefusalText(refusal, m.offer_refused_some()) ?? m.offer_send_error()}
          </p>
          {refusal.reason === "no_address" ? <LinkCosmoButton /> : null}
        </div>
      }
      cancel={
        <Button variant="outline" onClick={onLeave}>
          {m.common_modal_close()}
        </Button>
      }
    />
  );
}

/** For a sender with no Cosmo linked: off to link one, which leaves the page. */
function LinkCosmoButton() {
  return (
    <Button variant="outline" size="sm" render={<Link to="/account/profiles" />}>
      <LinkIcon />
      {m.link_link_cosmo()}
    </Button>
  );
}

export type SendFailure = { text: string; remove: boolean; link: boolean };

/** Why the last send failed. Always mounted, empty until then: Send's description points at it. */
export function SendError({ id, error }: { id: string; error: SendFailure | null }) {
  return (
    <div id={id} role="alert" className="empty:sr-only">
      {error ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-destructive-foreground text-sm text-pretty">
            {error.text}
            {error.remove ? <span className="block">{m.offer_refused_remove_hint()}</span> : null}
          </p>
          {error.link ? <LinkCosmoButton /> : null}
        </div>
      ) : null}
    </div>
  );
}
