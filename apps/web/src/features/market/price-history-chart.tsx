import {
  floorChange,
  PRICE_HISTORY_RANGES,
  type PriceHistoryRange,
  rangeStart,
  rangesLocked,
  utcDate,
} from "@repo/api/schemas/price-history";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, Bar, ComposedChart, Line, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { priceHistoryOptions } from "@/features/objekt/queries";
import { useCurrency } from "@/features/settings/use-currency";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { formatUtcDay } from "./format-utc-day";
import { PriceDelta } from "./price-delta";
import { toRows } from "./price-history-rows";

const RANGE_LABEL: Record<PriceHistoryRange, () => string> = {
  "7d": m.objekt_market_range_7d,
  "30d": m.objekt_market_range_30d,
  "90d": m.objekt_market_range_90d,
  all: m.objekt_market_range_all,
};

const isRange = (value: string): value is PriceHistoryRange =>
  PRICE_HISTORY_RANGES.some((range) => range === value);

export function PriceHistoryChart({
  slug,
  since,
  liveFloor,
}: {
  slug: string;
  /** the collection's first record */
  since: string;
  /** the live floor in USD, or null with nothing priced */
  liveFloor: number | null;
}) {
  const [now] = useState(() => new Date());
  const locked = rangesLocked(since, now);
  const [picked, setPicked] = useState<PriceHistoryRange>("30d");
  const range = locked ? "all" : picked;

  const { currency, fromUsd, format } = useCurrency();
  const history = useQuery(priceHistoryOptions(slug, range));

  const today = utcDate(now);
  const start = rangeStart(range, now);
  const points = history.data?.points;
  const rows = useMemo(
    () => (points ? toRows(points, start, today, fromUsd) : []),
    [points, start, today, fromUsd],
  );

  const config = {
    floor: { label: m.objekt_market_chart_floor(), color: "var(--chart-1)" },
    median: { label: m.objekt_market_chart_median(), color: "var(--chart-2)" },
    listings: { label: m.objekt_market_chart_listings(), color: "var(--chart-4)" },
  } satisfies ChartConfig;

  const first = points?.[0];
  const change = first ? floorChange(first.floorUsd, liveFloor) : null;

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-label={m.objekt_market_history()}
        value={[range]}
        onValueChange={([next]) => {
          if (next !== undefined && isRange(next)) setPicked(next);
        }}
      >
        {PRICE_HISTORY_RANGES.map((value) => (
          <ToggleGroupItem
            key={value}
            value={value}
            disabled={locked && value !== "all"}
            className="text-muted-foreground data-pressed:text-foreground h-7 sm:h-6 sm:text-xs"
          >
            {RANGE_LABEL[value]()}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {history.isPending ? (
        <Skeleton className="h-56 rounded-lg" />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-56 w-full">
          <ComposedChart accessibilityLayer data={rows}>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              minTickGap={32}
              tickFormatter={(date: string) => formatUtcDay(date, "short")}
            />
            <YAxis
              yAxisId="price"
              width={56}
              tickLine={false}
              axisLine={false}
              domain={["auto", "auto"]}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat(getLocale(), {
                  style: "currency",
                  currency,
                  notation: "compact",
                  maximumFractionDigits: 2,
                }).format(value)
              }
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              hide
              domain={[0, (max: number) => max * 4]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const date = payload[0]?.payload?.date;
                    return typeof date === "string" ? formatUtcDay(date) : null;
                  }}
                  formatter={(value, name, item, index, payload) => (
                    <>
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span
                            className="size-2.5 shrink-0 rounded-xs"
                            style={{ backgroundColor: item.color }}
                          />
                          {config[name as keyof typeof config]?.label ?? name}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {name === "listings" ? String(value) : format(Number(value))}
                        </span>
                      </div>
                      {currency !== "USD" &&
                        index === payload.filter((entry) => entry.type !== "none").length - 1 && (
                          <p className="text-muted-foreground w-0 min-w-full text-xs whitespace-normal">
                            {m.objekt_market_approx()}
                          </p>
                        )}
                    </>
                  )}
                />
              }
            />
            <Bar
              yAxisId="count"
              dataKey="listings"
              maxBarSize={16}
              name="listings"
              fill="var(--color-listings)"
              fillOpacity={0.25}
              radius={2}
              isAnimationActive={false}
            />
            <Area
              yAxisId="price"
              dataKey="floor"
              name="floor"
              type="monotone"
              stroke="var(--color-floor)"
              fill="var(--color-floor)"
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              dataKey="median"
              name="median"
              type="monotone"
              stroke="var(--color-median)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              dataKey="bridge"
              type="linear"
              stroke="var(--color-floor)"
              strokeOpacity={0.4}
              strokeWidth={1.5}
              strokeDasharray="2 3"
              dot={false}
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ChartContainer>
      )}

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        {first && change !== null && points.length >= 2 ? (
          <span className="inline-flex items-center gap-1.5">
            {m.objekt_market_vs({ date: formatUtcDay(first.date) })}
            <PriceDelta change={change} />
          </span>
        ) : (
          <span />
        )}
        <span>{m.objekt_market_tracking_since({ date: formatUtcDay(since) })}</span>
      </div>
    </div>
  );
}
