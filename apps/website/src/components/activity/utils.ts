import { Addresses } from "@repo/lib";

import type { Filters } from "@/hooks/use-filters";
import type { ValidType } from "@/lib/universal/activity";
import type { ActivityData } from "@/lib/universal/activity";

export type EventType = "mint" | "spin" | "transfer";

export function getEventType(from: string, to: string): EventType {
  if (from === Addresses.NULL) return "mint";
  if (to === Addresses.SPIN) return "spin";
  return "transfer";
}

export function filterData(
  data: ActivityData[],
  type: ValidType,
  filters: Filters,
): ActivityData[] {
  const artistSet = filters.artist?.length
    ? new Set(filters.artist.map((a) => a.toLowerCase()))
    : null;
  const memberSet = filters.member?.length ? new Set(filters.member) : null;
  const seasonSet = filters.season?.length ? new Set(filters.season) : null;
  const classSet = filters.class?.length ? new Set(filters.class) : null;
  const onOfflineSet = filters.on_offline?.length ? new Set(filters.on_offline) : null;
  const collectionSet = filters.collection?.length ? new Set(filters.collection) : null;

  return data.filter((item) => {
    if (type !== "all") {
      const eventType = getEventType(item.transfer.from, item.transfer.to);
      if (type !== eventType) return false;
    }

    if (artistSet && !artistSet.has(item.objekt.artist.toLowerCase())) return false;
    if (memberSet && !memberSet.has(item.objekt.member)) return false;
    if (seasonSet && !seasonSet.has(item.objekt.season)) return false;
    if (classSet && !classSet.has(item.objekt.class)) return false;
    if (onOfflineSet && !onOfflineSet.has(item.objekt.onOffline)) return false;
    if (collectionSet && !collectionSet.has(item.objekt.collectionNo)) return false;

    return true;
  });
}
