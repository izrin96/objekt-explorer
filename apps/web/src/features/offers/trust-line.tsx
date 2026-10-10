import type { Reputation } from "@repo/api/schemas/reputation";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { Mono, MonoMessage } from "./mono";

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
 * "31 verified · 2 unfinished · 100% · since Mar 2025": completed trades, failed ones where the
 * account didn't send its part (only when above 0), the positive share of rated ones and the
 * account's month. Only where the account is already named; null renders nothing.
 */
export function TrustLine({
  reputation,
  className,
}: {
  reputation: Reputation | null | undefined;
  className?: string;
}) {
  if (!reputation) return null;
  const { unfinished } = reputation;
  const count = unfinished.toLocaleString(getLocale());
  const hint = m.trust_unfinished_hint();
  return (
    // a span, so it can sit inside a button's phrasing content (the For you row)
    <span className={cn("text-muted-foreground block text-xs tabular-nums", className)}>
      <span className="sr-only">{m.trust_label()} </span>
      {reputation.verified === 0 ? (
        unfinished > 0 ? (
          <span title={hint}>
            <MonoMessage values={[count]} text={([n]) => m.trust_none_unfinished({ count: n! })} />
            <span className="sr-only"> ({hint})</span>
          </span>
        ) : (
          m.trust_none()
        )
      ) : (
        <>
          <MonoMessage
            values={[reputation.verified.toLocaleString(getLocale())]}
            text={([count]) => m.trust_verified({ count: count! })}
          />
          {unfinished > 0 ? (
            <>
              {" · "}
              <span title={hint} className="text-destructive-foreground">
                <MonoMessage values={[count]} text={([n]) => m.trust_unfinished({ count: n! })} />
                <span className="sr-only"> ({hint})</span>
              </span>
            </>
          ) : null}
          {reputation.positive !== null ? (
            <>
              {" · "}
              <Mono aria-hidden>{`${reputation.positive}%`}</Mono>
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
