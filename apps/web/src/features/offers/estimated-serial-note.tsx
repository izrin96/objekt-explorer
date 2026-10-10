import { InfoIcon } from "@phosphor-icons/react";

import { m } from "@/paraglide/messages";

/** Said once per surface, under the objekts whose "~" it explains. */
export function EstimatedSerialNote() {
  return (
    <p className="text-muted-foreground flex items-start gap-1.5 text-xs text-pretty">
      <InfoIcon aria-hidden className="mt-px size-3.5 shrink-0" />
      {m.offer_serial_estimated_note()}
    </p>
  );
}
