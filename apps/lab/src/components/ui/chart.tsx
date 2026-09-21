import { createContext, type ReactElement, use, useMemo } from "react";
import type { TooltipProps } from "recharts";
import { ResponsiveContainer, Tooltip as TooltipPrimitive } from "recharts";
import type {
  NameType,
  Props as TooltipContentProps,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { cn } from "@/lib/utils";

/**
 * The recharts wrapper, ported from `apps/website/src/components/intentui/chart.tsx`
 * down to what the Progress chart uses: the themed container, the tooltip and
 * its content. The website's version also carries a legend, axis wrappers, a
 * cartesian grid and a `--color-<key>` style block driven by `ChartConfig`;
 * none of those have a caller here — the Progress bars carry their member
 * colour per datum, and the axes are imported from recharts directly.
 *
 * The one thing that had to go rather than be trimmed is `ChartLegendContent`,
 * which is a react-aria `ToggleButtonGroup`. The lab is Base UI, so a legend
 * would be a rewrite, not a port.
 */

export type ChartConfig = Record<
  string,
  { label?: React.ReactNode; icon?: React.ComponentType; color?: string }
>;

type ChartLayout = "horizontal" | "vertical" | "radial";

type ChartContextProps = {
  config: ChartConfig;
  data: Record<string, unknown>[];
  layout: ChartLayout;
  dataKey: string;
};

const ChartContext = createContext<ChartContextProps | null>(null);

function useChart(): ChartContextProps {
  const context = use(ChartContext);
  if (!context) throw new Error("useChart must be used within a <Chart />");
  return context;
}

/**
 * The themed container. Recharts paints its axis ticks and cursor with
 * hardcoded hex, so the theme is applied from the outside with descendant
 * selectors — that list is the website's, unchanged, because it is keyed on
 * recharts' own class names rather than on anything app-shaped.
 */
export function Chart({
  className,
  children,
  config,
  data,
  dataKey,
  layout = "horizontal",
  containerHeight = 370,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  config: ChartConfig;
  data: Record<string, unknown>[];
  dataKey: string;
  layout?: ChartLayout;
  containerHeight?: number;
  children: ReactElement;
}) {
  const value = useMemo(() => ({ config, data, dataKey, layout }), [config, data, dataKey, layout]);

  return (
    <ChartContext value={value}>
      <div
        className={cn(
          "z-20 flex w-full justify-center text-xs",
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/80 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-surface_.recharts-text.recharts-cartesian-axis-tick-value]:*:fill-muted-foreground [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          "[&_.recharts-surface_g]:focus:outline-hidden",
          className,
        )}
        {...props}
      >
        <ResponsiveContainer height={containerHeight}>{children}</ResponsiveContainer>
      </div>
    </ChartContext>
  );
}

const tooltipWrapperStyle = { outline: "none" } as const;

const cursorStyle = {
  stroke: "var(--muted)",
  strokeWidth: 1,
  fill: "var(--muted)",
  fillOpacity: 0.5,
} as const;

export function ChartTooltip(props: TooltipProps) {
  return <TooltipPrimitive wrapperStyle={tooltipWrapperStyle} cursor={cursorStyle} {...props} />;
}

function payloadConfig(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined;
  const inner =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;

  let labelKey: string = key;
  const own = (payload as Record<string, unknown>)[key];
  if (typeof own === "string") labelKey = own;
  else if (inner && typeof inner[key] === "string") labelKey = inner[key];

  return config[labelKey] ?? config[key];
}

/**
 * The tooltip body. `formatter` owns the whole row when it is given — the
 * Progress chart uses that to render the member's own swatch, name and
 * `count/total` — so the indicator / label path below it only runs for a
 * chart that has no formatter of its own.
 */
export function ChartTooltipContent<TValue extends ValueType, TName extends NameType>({
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelSeparator = true,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: TooltipContentProps<TValue, TName> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    labelSeparator?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }) {
  const { config } = useChart();

  const tooltipLabel = useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    if (!item) return null;

    const key = `${labelKey || item.dataKey || item.name || "value"}`;
    const itemConfig = payloadConfig(config, item, key);
    const value =
      !labelKey && typeof label === "string" ? (config[label]?.label ?? label) : itemConfig?.label;

    if (labelFormatter)
      return <div className={labelClassName}>{labelFormatter(value, payload)}</div>;
    if (!value) return null;
    return <div className={labelClassName}>{value}</div>;
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "bg-popover/70 text-popover-foreground grid min-w-48 items-start rounded-lg p-3 py-2 text-xs ring ring-current/10 backdrop-blur-lg",
        className,
      )}
    >
      {!hideLabel && (
        <>
          {!nestLabel && <span className="font-medium">{tooltipLabel}</span>}
          {labelSeparator && (
            <span aria-hidden className="bg-background/10 mt-2 mb-3 block h-px w-full" />
          )}
        </>
      )}
      <div className="grid gap-3">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = payloadConfig(config, item, key);
          const indicatorColor = color || item.payload?.fill || item.color;

          return (
            <div
              key={key}
              className={cn(
                "*:[svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2",
                indicator === "dot" && "items-center *:[svg]:size-2.5",
                indicator === "line" && "*:[svg]:h-full *:[svg]:w-2.5",
              )}
            >
              {formatter && item.value !== undefined && item.name ? (
                formatter(item.value, item.name, item, index, item.payload)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-full border-(--color-border) bg-(--color-bg)",
                          indicator === "dot" && "size-2.5",
                          indicator === "line" && "w-1",
                          indicator === "dashed" &&
                            "w-0 border-[1.5px] border-dashed bg-transparent",
                        )}
                        style={
                          {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label ?? item.name}
                      </span>
                    </div>
                    {item.value !== undefined && (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {String(item.value)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
