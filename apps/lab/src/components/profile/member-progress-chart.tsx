import { useMemo } from "react";
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts";
import type { BarShapeProps } from "recharts/types/cartesian/Bar";

import type { MemberProgress } from "@/components/profile/progress-data";
import { Chart, type ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { inkOn } from "@/lib/color";

/** one datum of the member chart */
type ChartRow = {
  name: string;
  count: number;
  total: number;
  percentage: number;
  fill: string;
};

/**
 * `stats_member_progress_percentage_label`. Nothing renders it — the tooltip
 * below hands `formatter` the whole row — but the config is what `Chart`
 * keys its context on, so it stays the website's string rather than a second
 * one invented here.
 */
const CHART_CONFIG = {
  percentage: { label: "Percentage" },
} satisfies ChartConfig;

/**
 * Rough advance width of one character of the label at the chart's 12px type.
 * The value label is SVG text with no box to measure, and the only question it
 * has to answer is "has the bar reached under me yet" — a few pixels either
 * way changes nothing, so an estimate beats a measuring pass.
 */
const LABEL_CHAR_PX = 6.8;

/**
 * The shape the website's `MemberProgressChart` draws: a horizontal bar per
 * member in scope, sorted by completion, filled with the member's own Cosmo
 * colour, with `count/total (pct%)` set against the right end of the bar's
 * background track.
 *
 * Shared by the Progress tab — where clicking a bar writes the member into the
 * filter store, which is what switches that tab over to its section list — and
 * by the Statistics tab's third card, where it is one of three panels and has
 * nothing to select into. `onSelect` is therefore optional: without it the
 * bars are a read-only picture and stop offering a pointer.
 */
export function MemberProgressChart({
  rows,
  onSelect,
}: {
  rows: MemberProgress[];
  onSelect?: (member: string) => void;
}) {
  const data = useMemo<ChartRow[]>(
    () =>
      rows.map((row) => ({
        name: row.member,
        count: row.owned,
        total: row.total,
        percentage: Number(row.pct.toFixed(1)),
        fill: row.color,
      })),
    [rows],
  );

  return (
    <Chart
      layout="vertical"
      data={data}
      dataKey="percentage"
      config={CHART_CONFIG}
      containerHeight={data.length * 40}
      className="w-full"
    >
      <BarChart accessibilityLayer data={data} layout="vertical" barSize={32}>
        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={90} />
        <XAxis dataKey="percentage" type="number" hide domain={[0, 100]} />
        <Bar
          animationBegin={0}
          animationDuration={500}
          dataKey="percentage"
          radius={5}
          className={onSelect && "cursor-pointer"}
          /* the datum is read out of `data` by index rather than off the
             shape props, which recharts types as `any` — same values, and the
             `count` / `total` / `fill` fields stay typed */
          shape={(props: BarShapeProps) => {
            const row = data[props.index];
            if (!row) return <g />;
            const label = `${row.count}/${row.total} (${row.percentage}%)`;
            /* the label stays pinned to the track's right edge, so a column of
               numbers still lines up; what changes is whether the bar has
               grown far enough to be *under* it */
            const labelRight = (props.background?.width ?? 0) + props.x - 10;
            const onFill = props.x + props.width >= labelRight - label.length * LABEL_CHAR_PX;
            return (
              <>
                <Rectangle
                  x={props.x}
                  y={props.y}
                  width={props.width}
                  height={props.height}
                  radius={5}
                  fill={row.fill}
                  className={onSelect && "cursor-pointer"}
                  onClick={onSelect && (() => onSelect(row.name))}
                />
                <text
                  x={labelRight}
                  y={props.y + 20}
                  textAnchor="end"
                  /* over the empty track the page's own ink is right; over the
                     member's colour it is whatever that colour can carry —
                     `var(--foreground)` is near-white on dark, and YuBin's `#FFE3E2`
                     bar swallows it whole */
                  fill={onFill ? inkOn(row.fill) : "var(--foreground)"}
                >
                  {label}
                </text>
              </>
            );
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelSeparator={false}
              indicator="line"
              formatter={(value, _name, item) => {
                const row = data.find((r) => r.name === item.payload?.name);
                if (!row) return null;
                return (
                  <>
                    {/* a pale member colour has no edge of its own, and on
                        the light theme the swatch is the tooltip's own surface
                        colour without the ring */}
                    <div
                      className="ring-foreground/15 w-1 shrink-0 rounded-xs bg-(--swatch) ring-1"
                      style={{ "--swatch": row.fill } as React.CSSProperties}
                    />
                    <div className="flex flex-1 items-center justify-between leading-none">
                      <div className="grid gap-1.5">
                        {row.name}
                        <span className="text-foreground">
                          {row.count}/{row.total}
                        </span>
                      </div>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {String(value)}%
                      </span>
                    </div>
                  </>
                );
              }}
            />
          }
        />
      </BarChart>
    </Chart>
  );
}
