import type { Reputation } from "@repo/api/schemas/reputation";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

/** `since` is `YYYY-MM`; read in UTC, so the server and the browser print the same month. */
function sinceLabel(since: string) {
  const [year, month] = since.split("-").map(Number);
  if (!year || !month) return since;
  return new Intl.DateTimeFormat(getLocale(), {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1)));
}

/**
 * "31 verified · 100% · since Mar 2025": completed trades, the positive share of rated ones and
 * the account's month. Only where the account is already named; null renders nothing.
 */
export function TrustLine({
  reputation,
  className,
}: {
  reputation: Reputation | null | undefined;
  className?: string;
}) {
  if (!reputation) return null;
  return (
    // a span, so it can sit inside a button's phrasing content (the For you row)
    <span className={cn("text-muted-foreground block text-xs tabular-nums", className)}>
      <span className="sr-only">{m.trust_label()} </span>
      {reputation.verified === 0 ? (
        m.trust_none()
      ) : (
        <>
          {m.trust_verified({ count: reputation.verified.toLocaleString(getLocale()) })}
          {reputation.positive !== null ? (
            <>
              {" · "}
              <span aria-hidden>{`${reputation.positive}%`}</span>
              <span className="sr-only">{m.trust_positive({ percent: reputation.positive })}</span>
            </>
          ) : null}
          {" · "}
          {m.trust_since({ month: sinceLabel(reputation.since) })}
        </>
      )}
    </span>
  );
}
