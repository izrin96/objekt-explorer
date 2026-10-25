import { LinkIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter, DialogPanel } from "@/components/ui/dialog";
import { type OfferRefusalInfo, offerRefusalText } from "@/features/offers/refusal";
import { m } from "@/paraglide/messages";

import { BuilderHeader } from "./header";
import type { OfferRequest } from "./types";

/** Reads like a refused Message: nothing can be sent, so the only way out is Close. */
export function BuilderRefused({
  request,
  refusal,
  onDone,
}: {
  request: OfferRequest;
  refusal: OfferRefusalInfo;
  onDone: () => void;
}) {
  return (
    <>
      <BuilderHeader request={request} />
      <DialogPanel>
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="text-sm text-pretty">
            {offerRefusalText(refusal, m.offer_refused_some()) ?? m.offer_send_error()}
          </p>
          {refusal.reason === "no_address" ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/account/profiles" />}
              onClick={onDone}
            >
              <LinkIcon />
              {m.link_link_cosmo()}
            </Button>
          ) : null}
        </div>
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
      </DialogFooter>
    </>
  );
}
