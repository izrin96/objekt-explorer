import { LinkIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogPanel } from "@/components/ui/dialog";
import { type OfferRefusalInfo, offerRefusalText } from "@/features/offers/refusal";
import { m } from "@/paraglide/messages";

/** Reads like a refused Message: nothing can be sent, so the only way out is Close. */
export function BuilderRefused({
  refusal,
  onDone,
}: {
  refusal: OfferRefusalInfo;
  onDone: () => void;
}) {
  return (
    <>
      <DialogPanel>
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-pretty">
            {offerRefusalText(refusal, m.offer_refused_some()) ?? m.offer_send_error()}
          </p>
          {refusal.reason === "no_address" ? <LinkCosmoButton onDone={onDone} /> : null}
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
      </DialogFooter>
    </>
  );
}

/** For a sender with no Cosmo linked: off to link one, closing the builder. */
function LinkCosmoButton({ onDone }: { onDone: () => void }) {
  return (
    <Button variant="outline" size="sm" render={<Link to="/account/profiles" />} onClick={onDone}>
      <LinkIcon />
      {m.link_link_cosmo()}
    </Button>
  );
}

export type SendFailure = { text: string; remove: boolean; link: boolean };

/** Why the last send failed. Always mounted, empty until then: Send's description points at it. */
export function SendError({
  id,
  error,
  onDone,
}: {
  id: string;
  error: SendFailure | null;
  onDone: () => void;
}) {
  return (
    <div id={id} role="alert" className="empty:hidden">
      {error ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-destructive-foreground text-sm text-pretty">
            {error.text}
            {error.remove ? <span className="block">{m.offer_refused_remove_hint()}</span> : null}
          </p>
          {error.link ? <LinkCosmoButton onDone={onDone} /> : null}
        </div>
      ) : null}
    </div>
  );
}
