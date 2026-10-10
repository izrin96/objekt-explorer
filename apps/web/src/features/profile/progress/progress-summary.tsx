import type { ReactNode } from "react";

import { MessageMarkup } from "@/components/shared/message-markup";
import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import { m } from "@/paraglide/messages";

import type { MemberProgress, Tally } from "./shape-progress";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-popover rounded-lg border px-4 py-3.5">
      <h2 className="font-display text-foreground/80 mb-2.5 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** the overall meter beside the three started members closest to complete */
export function ProgressSummary({
  totals,
  best,
  closest,
  onPickMember,
}: {
  totals: Tally;
  best: MemberProgress | undefined;
  closest: MemberProgress[];
  onPickMember: (member: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
      <Panel title={m.progress_overall()}>
        {/* hidden from screen readers: the meter below announces the same figures */}
        <div
          aria-hidden
          className="font-mono text-3xl leading-none font-semibold tracking-tight tabular-nums"
        >
          {totals.pct.toFixed(1)}
          <small className="text-muted-foreground text-sm font-medium tracking-normal">
            % · {totals.owned.toLocaleString()} / {totals.total.toLocaleString()}
          </small>
        </div>
        {/* min-w-1 keeps a sliver showing at 0% */}
        <Meter
          value={totals.pct}
          aria-label={m.progress_overall()}
          getAriaValueText={() =>
            `${totals.pct.toFixed(1)}%, ${totals.owned.toLocaleString()} / ${totals.total.toLocaleString()}`
          }
          className="mt-2.5"
        >
          <MeterTrack className="bg-secondary h-1.5 rounded-sm">
            <MeterIndicator className="bg-foreground min-w-1 rounded-sm" />
          </MeterTrack>
        </Meter>
        {best && (
          <p className="text-muted-foreground mt-2 text-xs">
            {m.progress_best_member()}: <b className="text-foreground font-mono">{best.member}</b>{" "}
            <b className="text-foreground font-mono tabular-nums">{best.pct.toFixed(0)}%</b>
          </p>
        )}
      </Panel>
      <Panel title={m.progress_closest_title()}>
        {closest.length === 0 && (
          <p className="text-muted-foreground text-sm">{m.progress_closest_empty()}</p>
        )}
        <ul className="flex flex-col gap-0.5">
          {closest.map((row) => (
            <li key={row.member}>
              {/* the same action as clicking that member's bar in the chart */}
              <button
                type="button"
                onClick={() => onPickMember(row.member)}
                className="hover:bg-secondary/60 -mx-1.5 flex w-[calc(100%+--spacing(3))] cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-sm"
              >
                <span
                  className="ring-foreground/15 size-2.5 flex-none rounded-[3px] ring-1"
                  style={{ background: row.color }}
                />
                <span className="truncate font-medium">{row.member}</span>
                <span className="text-muted-foreground ml-auto flex-none font-mono text-xs tabular-nums">
                  <MessageMarkup
                    parts={m.progress_to_go.parts({
                      count: (row.total - row.owned).toLocaleString(),
                    })}
                    markup={{ b: (children) => <b className="text-foreground">{children}</b> }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
