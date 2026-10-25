import type { PriceHistoryOutput } from "@repo/api/schemas/market";

export type HistoryPoint = PriceHistoryOutput["points"][number];

export type HistoryRow = {
  date: string;
  floor: number | null;
  median: number | null;
  listings: number | null;
  /** the floor on the recorded days either side of a gap, interpolated across the gap's own days */
  bridge: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function nextDay(date: string) {
  return new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);
}

/**
 * One row per UTC day from `start` (the first point when null) to `today`. A day without a
 * record has no values; leading days before the first record have no bridge either.
 */
export function toRows(
  points: HistoryPoint[],
  start: string | null,
  today: string,
  convert: (usd: number) => number,
): HistoryRow[] {
  const first = start ?? points[0]?.date;
  if (first === undefined || first > today) return [];

  const byDate = new Map(points.map((point) => [point.date, point]));
  const rows: HistoryRow[] = [];
  for (let date = first; date <= today; date = nextDay(date)) {
    const point = byDate.get(date);
    rows.push({
      date,
      floor: point ? convert(point.floorUsd) : null,
      median: point ? convert(point.medianUsd) : null,
      listings: point?.listingCount ?? null,
      bridge: null,
    });
  }

  let lastRecorded: number | null = null;
  rows.forEach((row, index) => {
    if (row.floor === null) return;
    if (lastRecorded !== null && index - lastRecorded > 1) {
      const from = rows[lastRecorded]!;
      const span = index - lastRecorded;
      for (let i = lastRecorded; i <= index; i++) {
        rows[i]!.bridge = from.floor! + ((row.floor - from.floor!) * (i - lastRecorded)) / span;
      }
    }
    lastRecorded = index;
  });

  return rows;
}
