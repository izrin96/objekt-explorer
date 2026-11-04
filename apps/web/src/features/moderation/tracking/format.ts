const MAX_TRADE_ID = 2_147_483_647;

/** A trade's number as staff type it (`T-1042`, `1042`, `#1042`), or null. */
export function parseTradeNumber(text: string): number | null {
  const match = /^(?:t-|#)?(\d+)$/i.exec(text.trim());
  if (!match) return null;
  const id = Number(match[1]);
  return id >= 1 && id <= MAX_TRADE_ID ? id : null;
}

type SpanUnit = "day" | "hour" | "minute";

/** A length of time in its two largest units: minutes, hours and minutes, or days and hours. */
export function spanParts(seconds: number): { value: number; unit: SpanUnit }[] {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return [{ value: minutes, unit: "minute" }];
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    const rest = minutes % 60;
    return rest === 0
      ? [{ value: hours, unit: "hour" }]
      : [
          { value: hours, unit: "hour" },
          { value: rest, unit: "minute" },
        ];
  }
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0
    ? [{ value: days, unit: "day" }]
    : [
        { value: days, unit: "day" },
        { value: rest, unit: "hour" },
      ];
}

export function spanText(seconds: number, locale: string) {
  return spanParts(seconds)
    .map(({ value, unit }) =>
      new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" }).format(value),
    )
    .join(" ");
}

/** A `YYYY-MM-DD` UTC day as a short date, read in UTC so no viewer sees the day before. */
export function dayLabel(day: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

export function sharePercent(part: number, total: number, locale: string) {
  if (total === 0) return null;
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(
    part / total,
  );
}
