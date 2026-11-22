import type {
  ValidCustomSort,
  ValidEdition,
  ValidGroupBy,
  ValidOnlineType,
  ValidSortDirection,
} from "@repo/cosmo/types/common";

import { m } from "@/paraglide/messages";

import type { ListedWindow } from "./listed-window";

/** the website's `getEditionStr`; the ordinals are product terms, not prose */
export const EDITION_LABEL: Record<ValidEdition, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

export const ONLINE_TYPE_LABEL: Record<ValidOnlineType, () => string> = {
  online: m.filter_digital,
  offline: m.filter_physical,
};

/** a sort's menu label names its direction, so the menu needs no separate arrow */
export const SORT_OPTION_LABEL: Record<
  ValidCustomSort,
  Record<ValidSortDirection, () => string>
> = {
  date: { desc: m.filter_sort_option_date_desc, asc: m.filter_sort_option_date_asc },
  season: { asc: m.filter_sort_option_season_asc, desc: m.filter_sort_option_season_desc },
  collectionNo: {
    asc: m.filter_sort_option_collection_no_asc,
    desc: m.filter_sort_option_collection_no_desc,
  },
  member: { asc: m.filter_sort_option_member_asc, desc: m.filter_sort_option_member_desc },
  serial: { asc: m.filter_sort_option_serial_asc, desc: m.filter_sort_option_serial_desc },
  duplicate: { desc: m.filter_sort_option_dups_desc, asc: m.filter_sort_option_dups_asc },
  rare: { asc: m.filter_sort_option_rare_asc, desc: m.filter_sort_option_rare_desc },
  price: { asc: m.filter_sort_option_price_asc, desc: m.filter_sort_option_price_desc },
  floor: { asc: m.filter_sort_option_floor_asc, desc: m.filter_sort_option_floor_desc },
  listedAt: { desc: m.filter_sort_option_listed_desc, asc: m.filter_sort_option_listed_asc },
  supply: { desc: m.filter_sort_option_supply_desc, asc: m.filter_sort_option_supply_asc },
};

export const GROUP_BY_LABEL: Record<ValidGroupBy, () => string> = {
  artist: m.filter_group_by_artist,
  class: m.filter_group_by_class,
  collectionNo: m.filter_group_by_collection_no,
  member: m.filter_group_by_member,
  season: m.filter_group_by_season,
  seasonCollectionNo: m.filter_group_by_season_collection_no,
};

export const LISTED_WINDOW_LABEL: Record<ListedWindow, () => string> = {
  "24h": m.filter_listed_24h,
  "7d": m.filter_listed_7d,
  "30d": m.filter_listed_30d,
};
