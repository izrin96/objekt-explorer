import type { TrackerHealth } from "@repo/api/schemas/staff-totals";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/number";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { When } from "../console/when";
import { spanText } from "./format";
import { LoadFailed, Slotted } from "./parts";
import { trackerHealthOptions } from "./queries";

export function HealthStrip() {
  const query = useQuery(trackerHealthOptions());
  if (query.isPending) return <Skeleton className="h-10 rounded-md" />;
  if (query.isError) return <LoadFailed onRetry={() => void query.refetch()} />;
  return <HealthLine health={query.data} />;
}

function HealthLine({ health }: { health: TrackerHealth }) {
  const { indexer } = health;
  const behind = indexer.state === "known" && indexer.behind;
  return (
    <section
      aria-label={m.mod_trades_health_label()}
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-sm",
        behind && "border-warning/30 bg-warning/8 text-warning-foreground dark:bg-warning/16",
      )}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            indexer.state === "unknown"
              ? "bg-muted-foreground"
              : behind
                ? "bg-warning"
                : "bg-success",
          )}
        />
        {indexer.state === "unknown"
          ? m.mod_trades_health_unknown()
          : behind
            ? m.mod_trades_health_behind()
            : m.mod_trades_health_caught_up()}
      </span>
      <span className={cn("flex flex-wrap gap-x-4 gap-y-1", !behind && "text-muted-foreground")}>
        {indexer.state === "known" ? (
          <span>
            <Slotted
              text={(time) =>
                m.mod_trades_health_read_up_to({
                  time,
                  ago: spanText(
                    (Date.parse(health.checkedAt) - Date.parse(indexer.seenUntil)) / 1000,
                    getLocale(),
                  ),
                })
              }
              node={<When iso={indexer.seenUntil} />}
            />
          </span>
        ) : null}
        <span>
          {health.verifierLastRun === null ? (
            m.mod_trades_health_verifier_unknown()
          ) : (
            <Slotted
              text={(time) => m.mod_trades_health_verifier({ time })}
              node={<When iso={health.verifierLastRun} />}
            />
          )}
        </span>
        <span>
          {m.mod_trades_health_open({
            legs: formatCount(health.open.legs),
            away: formatCount(health.open.away),
            stuck: formatCount(health.open.stuck),
            copies: formatCount(health.open.copies),
          })}
        </span>
        {behind ? <span>{m.mod_trades_health_behind_hint()}</span> : null}
      </span>
    </section>
  );
}
