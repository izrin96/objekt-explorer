import type { Reputation } from "@repo/api/schemas/reputation";

import { intlCached } from "@/lib/intl-cache";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

const months = new Map<string, Intl.DateTimeFormat>();

/** `since` is `YYYY-MM`; read in UTC, so the server and the browser print the same month. */
export function sinceLabel(since: string) {
  const [year, month] = since.split("-").map(Number);
  if (!year || !month) return since;
  const locale = getLocale();
  return intlCached(
    months,
    locale,
    () => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }),
  ).format(new Date(Date.UTC(year, month - 1)));
}

/**
 * "31 verified · 2 unfinished · 100% · since Mar 2025": completed trades, failed ones where the
 * account didn't send its part (only when above 0), the positive share of rated ones and the
 * account's month. Only where the account is already named; null renders nothing.
 * `compact` is for a narrow line: a bare "New" tag when there is nothing to report, and no month.
 */
export function TrustLine({
  reputation,
  variant = "full",
  className,
}: {
  reputation: Reputation | null | undefined;
  variant?: "full" | "compact";
  className?: string;
}) {
  if (!reputation) return null;
  const { unfinished } = reputation;
  if (variant === "compact" && reputation.verified === 0 && unfinished === 0) {
    return (
      <span
        className={cn("bg-secondary text-muted-foreground rounded-sm px-1.5 text-xs", className)}
      >
        <span aria-hidden>{m.trust_new()}</span>
        <span className="sr-only">{m.trust_new_aria()}</span>
      </span>
    );
  }
  const count = unfinished.toLocaleString(getLocale());
  const hint = m.trust_unfinished_hint();
  return (
    // a span, so it can sit inside a button's phrasing content (the For you row)
    <span className={cn("text-muted-foreground block text-xs", className)}>
      <span className="sr-only">{m.trust_label()} </span>
      {reputation.verified === 0 ? (
        unfinished > 0 ? (
          <span title={hint} className="text-warning-foreground whitespace-nowrap">
            {m.trust_none_unfinished({ count })}
            <span className="sr-only"> ({hint})</span>
          </span>
        ) : (
          m.trust_none()
        )
      ) : (
        <>
          {/* each " · " segment stays whole, so a wrapping line breaks only between them */}
          <span className="whitespace-nowrap">
            {m.trust_verified({ count: reputation.verified.toLocaleString(getLocale()) })}
          </span>
          {unfinished > 0 ? (
            <>
              {" · "}
              <span title={hint} className="text-warning-foreground whitespace-nowrap">
                {m.trust_unfinished({ count })}
                <span className="sr-only"> ({hint})</span>
              </span>
            </>
          ) : null}
          {reputation.positive !== null ? (
            <>
              {" · "}
              <span aria-hidden>{`${reputation.positive}%`}</span>
              <span className="sr-only">{m.trust_positive({ percent: reputation.positive })}</span>
            </>
          ) : null}
          {variant === "full" ? (
            <>
              {" · "}
              <span className="whitespace-nowrap">
                {m.trust_since({ month: sinceLabel(reputation.since) })}
              </span>
            </>
          ) : null}
        </>
      )}
    </span>
  );
}
