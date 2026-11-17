import { useQuery } from "@tanstack/react-query";

import { useMinuteClock } from "@/hooks/use-minute-clock";
import { formatCount } from "@/lib/number";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { cosmoMediaSummaryOptions } from "./queries";

/**
 * One counts-only line about the Cosmo sessions users connected. It reads client-side and draws
 * nothing until it has an answer, so a failed read leaves the table as it was.
 */
export function CosmoMediaSummary() {
  const { data } = useQuery(cosmoMediaSummaryOptions);
  const now = useMinuteClock();
  if (!data) return null;

  const recorded = m.mod_cosmo_media_recorded({ count: formatCount(data.recorded) });
  // sessions gone but their media recorded still counts: the record outlives the sessions
  const parts =
    data.live + data.signedOut === 0
      ? [m.mod_cosmo_media_none(), ...(data.recorded > 0 ? [recorded] : [])]
      : [
          m.mod_cosmo_media_connected({ count: formatCount(data.live) }),
          m.mod_cosmo_media_signed_out({ count: formatCount(data.signedOut) }),
          data.lastSyncedAt === null
            ? m.mod_cosmo_media_no_sync()
            : m.mod_cosmo_media_last_sync({
                time: relativeTime(new Date(data.lastSyncedAt).getTime(), now),
              }),
          recorded,
        ];

  return <p className="text-muted-foreground text-sm">{parts.join(" · ")}</p>;
}
