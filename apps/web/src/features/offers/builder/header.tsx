import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import type { OfferRequest } from "./types";

export function BuilderHeader({ request }: { request: OfferRequest }) {
  return (
    <DialogHeader>
      <DialogTitle className="font-display">
        {request.counter
          ? m.offer_builder_counter_title({ name: request.name })
          : m.offer_builder_title({ name: request.name })}
      </DialogTitle>
      <DialogDescription>{m.offer_builder_description()}</DialogDescription>
    </DialogHeader>
  );
}
