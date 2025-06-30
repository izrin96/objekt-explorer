import type { Filters } from "@/hooks/use-filters";
import type { ActivityData, ValidType } from "@/lib/universal/activity";
import type {
  ValidArtist,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
} from "@/lib/universal/cosmo/common";
import { NULL_ADDRESS, SPIN_ADDRESS } from "@/lib/utils";

export function filterData(
  data: ActivityData[],
  type: ValidType,
  filters: Filters,
): ActivityData[] {
  return data.filter((item) => {
    // Filter by type
    if (type !== "all") {
      const isMint = item.transfer.from === NULL_ADDRESS;
      const isSpin = item.transfer.to === SPIN_ADDRESS;
      const isTransfer = !isMint && !isSpin;

      if (type === "mint" && !isMint) return false;
      if (type === "spin" && !isSpin) return false;
      if (type === "transfer" && !isTransfer) return false;
    }

    // Filter by artist
    if (filters.artist?.length) {
      if (!filters.artist.includes(item.objekt.artist.toLowerCase() as ValidArtist)) {
        return false;
      }
    }

    // Filter by member
    if (filters.member?.length) {
      if (!filters.member.includes(item.objekt.member)) {
        return false;
      }
    }

    // Filter by season
    if (filters.season?.length) {
      if (!filters.season.includes(item.objekt.season as ValidSeason)) {
        return false;
      }
    }

    // Filter by class
    if (filters.class?.length) {
      if (!filters.class.includes(item.objekt.class as ValidClass)) {
        return false;
      }
    }

    // Filter by on/offline
    if (filters.on_offline?.length) {
      if (!filters.on_offline.includes(item.objekt.onOffline as ValidOnlineType)) {
        return false;
      }
    }

    return true;
  });
}
