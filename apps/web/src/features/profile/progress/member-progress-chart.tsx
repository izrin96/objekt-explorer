import { useMemo } from "react";
import { Bar, BarChart, Rectangle, XAxis, YAxis } from "recharts";
import type { BarShapeProps } from "recharts/types/cartesian/Bar";

import { Chart, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { inkOn } from "@/lib/color";
import { m } from "@/paraglide/messages";

import type { MemberProgress } from "./shape-progress";

type ChartRow = { name: string; count: number; total: number; percentage: number; fill: string };

const CHART_CONFIG = {
  percentage: { label: m.stats_member_progress_percentage_label() },
} satisfies ChartConfig;

/**
 * Rough advance width of one character at the chart's 12px type. The value
 * label is SVG text with no box to measure, and the only question it answers is
 * "has the bar reached under me yet", so an estimate beats a measuring pass.
 */
const LABEL_CHAR_PX = 6.8;

/** Without `onSelect` the bars are a read-only picture and offer no pointer. */
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
          /* the datum is read out of `data` by index rather than off the shape
             props, which recharts types as `any` */
          shape={(props: BarShapeProps) => {
            const row = data[props.index];
            if (!row) return <g />;
            const label = `${row.count}/${row.total} (${row.percentage}%)`;
            /* the label stays pinned to the track's right edge so a column of
               numbers lines up; what changes is whether the bar has grown far
               enough to be under it */
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
                     member's colour it is whatever that colour can carry */
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
                const row = data.find((candidate) => candidate.name === item.payload?.name);
                if (!row) return null;
                return (
                  <>
                    {/* a pale member colour has no edge of its own, and on the
                        light theme the swatch is the tooltip's own surface */}
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
