import type { TopupView } from "@repo/api/schemas/offer";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { topupAmount } from "./format";

/** Objekt data (numbers, serials, progress, amounts) is set in mono with tabular figures. */
export function Mono({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("font-mono tabular-nums", className)} {...props} />;
}

const SLOT = "\uE000";

/**
 * A message with only `values` in mono, so each locale keeps its own word order around them.
 * `text` gets one placeholder per value, in order.
 */
export function MonoMessage({
  text,
  values,
}: {
  text: (slots: string[]) => string;
  values: (string | number)[];
}) {
  const slots = values.map((_, index) => `${SLOT}${index}${SLOT}`);
  // one element, so a flex parent doesn't spread the pieces apart
  return (
    <span>
      {text(slots)
        .split(new RegExp(`${SLOT}(\\d+)${SLOT}`))
        .map((part, index) =>
          index % 2 === 0 ? part : <Mono key={index}>{values[Number(part)]}</Mono>,
        )}
    </span>
  );
}

export function Progress({ verified, total }: { verified: number; total: number }) {
  return (
    <MonoMessage
      values={[verified, total]}
      text={([done, all]) => m.offer_progress({ verified: done!, total: all! })}
    />
  );
}

/** Always says the money is outside the site: nothing here can verify it. */
export function TopupText({ topup }: { topup: TopupView }) {
  return (
    <MonoMessage
      values={[topupAmount(topup)]}
      text={([amount]) =>
        topup.payer === "you"
          ? m.offer_topup_you_pay({ amount: amount! })
          : m.offer_topup_they_pay({ amount: amount! })
      }
    />
  );
}
