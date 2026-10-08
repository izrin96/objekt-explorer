import { ShieldCheckIcon } from "@phosphor-icons/react";
import type { TradeView as Trade } from "@repo/api/schemas/offer";

import { TONE_EDGE, TONE_FILL, TONE_INK } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/** A suggestion shown the same way to both sides; nothing enforces it. */
export function FirstSender({
  sender,
  name,
}: {
  sender: NonNullable<Trade["firstSender"]>;
  name: string;
}) {
  const headline = sender.you ? m.offer_first_you() : m.offer_first_them({ name });
  const follow = sender.sent
    ? sender.you
      ? m.offer_first_you_sent()
      : m.offer_first_them_sent({ name })
    : null;
  return (
    <section
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3 text-sm",
        TONE_EDGE.progress,
        TONE_FILL.progress,
      )}
    >
      <h3 className="flex items-center gap-1.5 font-medium">
        <ShieldCheckIcon
          aria-hidden
          weight="fill"
          className={cn("size-4 shrink-0", TONE_INK.progress)}
        />
        {m.offer_first_title()}
      </h3>
      <p className="text-pretty">
        {headline}
        {follow ? <> {follow}</> : null}
      </p>
      <p className="text-muted-foreground text-xs text-pretty">{m.offer_first_hint()}</p>
    </section>
  );
}
