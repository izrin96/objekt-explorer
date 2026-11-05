import { HandshakeIcon } from "@phosphor-icons/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

import type { ObjektAsk } from "./near";

/**
 * The objekt drawer's line for an objekt from another person's have or sale strip: Make offer for
 * it, from that strip's list. It closes the drawer first, so the offer page isn't opened under it.
 */
export function ObjektOfferNote({ ask, onClose }: { ask: ObjektAsk; onClose: () => void }) {
  return (
    <Alert>
      <HandshakeIcon aria-hidden />
      <AlertDescription className="items-start">
        <p>{m.trade_objekt_offer_hint({ name: ask.person, list: ask.list })}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onClose();
            ask.offer();
          }}
        >
          {m.trade_objekt_offer()}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
