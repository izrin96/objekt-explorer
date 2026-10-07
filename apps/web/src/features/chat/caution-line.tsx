import { WarningIcon } from "@phosphor-icons/react";
import type { FlagCategory } from "@repo/api/schemas/chat";

import { m } from "@/paraglide/messages";

const CAUTION: Record<FlagCategory, () => string> = {
  send_first: m.mod_caution_send_first,
  outside_payment: m.mod_caution_outside_payment,
};

/** Shown only to the recipient; it informs, it never hides the message. */
export function CautionLine({ categories }: { categories: FlagCategory[] }) {
  return (
    <p className="text-foreground flex max-w-xs items-start gap-1.5 px-1 text-xs text-pretty">
      <WarningIcon
        aria-hidden
        weight="fill"
        className="text-muted-foreground mt-px size-3.5 shrink-0"
      />
      <span>
        <span className="font-medium">{m.mod_caution_title()}</span>{" "}
        {categories.length > 1
          ? m.mod_caution_both()
          : categories.map((category) => CAUTION[category]()).join(" ")}
      </span>
    </p>
  );
}
