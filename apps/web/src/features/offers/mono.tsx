import type { TopupView } from "@repo/api/schemas/offer";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { topupAmount } from "./format";

/** Identifiers (offer and trade numbers, serials) are set in mono with tabular figures. */
export function Mono({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("font-mono tabular-nums", className)} {...props} />;
}

export function Progress({ verified, total }: { verified: number; total: number }) {
  return <span className="tabular-nums">{m.offer_progress({ verified, total })}</span>;
}

/** Always says the money is outside the site: nothing here can verify it. */
export function TopupText({ topup }: { topup: TopupView }) {
  const amount = topupAmount(topup);
  return (
    <span className="tabular-nums">
      {topup.payer === "you"
        ? m.offer_topup_you_pay({ amount })
        : m.offer_topup_they_pay({ amount })}
    </span>
  );
}
