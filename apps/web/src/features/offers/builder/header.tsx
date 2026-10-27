import type { Ref } from "react";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

import type { OfferRequest } from "./types";

/** `titleRef` makes the title the dialog's first focus, where no field should take it. */
export function BuilderHeader({
  request,
  titleRef,
}: {
  request: OfferRequest;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <DialogHeader>
      <DialogTitle
        className="font-display outline-none"
        ref={titleRef}
        tabIndex={titleRef ? -1 : undefined}
      >
        {request.counter
          ? m.offer_builder_counter_title({ name: request.name })
          : m.offer_builder_title({ name: request.name })}
      </DialogTitle>
      <DialogDescription>{m.offer_builder_description()}</DialogDescription>
    </DialogHeader>
  );
}
