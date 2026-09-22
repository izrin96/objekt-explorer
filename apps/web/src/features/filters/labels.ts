import type {
  ValidCustomSort,
  ValidEdition,
  ValidGroupBy,
  ValidOnlineType,
} from "@repo/cosmo/types/common";

import { m } from "@/paraglide/messages";

/** the website's `getEditionStr`; the ordinals are product terms, not prose */
export const EDITION_LABEL: Record<ValidEdition, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

export const ONLINE_TYPE_LABEL: Record<ValidOnlineType, () => string> = {
  online: m.filter_digital,
  offline: m.filter_physical,
};

export const SORT_LABEL: Record<ValidCustomSort, () => string> = {
  date: m.filter_sort_by_date_label,
  season: m.filter_sort_by_season_label,
  collectionNo: m.filter_sort_by_collection_no_label,
  member: m.filter_sort_by_member_label,
  serial: m.filter_sort_by_serial_label,
  duplicate: m.filter_sort_by_dups_label,
  rare: m.filter_sort_by_rare_label,
  price: m.filter_sort_by_price_label,
  floor: m.filter_sort_by_floor_label,
  listedAt: m.filter_sort_by_listed_label,
  supply: m.filter_sort_by_supply_label,
};

export const GROUP_BY_LABEL: Record<ValidGroupBy, () => string> = {
  artist: m.filter_group_by_artist,
  class: m.filter_group_by_class,
  collectionNo: m.filter_group_by_collection_no,
  member: m.filter_group_by_member,
  season: m.filter_group_by_season,
  seasonCollectionNo: m.filter_group_by_season_collection_no,
};
