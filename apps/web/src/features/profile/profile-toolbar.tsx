import type { ValidCustomSort } from "@repo/cosmo/types/common";
import { type ComponentProps, useMemo } from "react";

import { ETC_CLASSES, useScopedFacets } from "@/features/filters/facets";
import { FilterBar } from "@/features/filters/filter-bar";
import type { LongTailField } from "@/features/filters/filter-popover";

/** an owned row carries a serial and a received date, so the profile sorts by them */
const PROFILE_SORTS: readonly ValidCustomSort[] = [
  "date",
  "season",
  "collectionNo",
  "member",
  "serial",
  "duplicate",
  "rare",
];

type ProfileToolbarProps = Omit<
  ComponentProps<typeof FilterBar>,
  "facets" | "groups" | "sorts" | "longTail"
> & {
  /** the tab's column of the long-tail matrix, from `LONG_TAIL` */
  longTail: readonly LongTailField[];
  /** Progress measures completion, which Welcome and Zero are not part of */
  hideEtcClasses?: boolean;
};

export function ProfileToolbar({ hideEtcClasses = false, ...props }: ProfileToolbarProps) {
  const { facets, groups } = useScopedFacets();

  const scoped = useMemo(
    () =>
      hideEtcClasses
        ? { ...facets, classes: facets.classes.filter((name) => !ETC_CLASSES.includes(name)) }
        : facets,
    [facets, hideEtcClasses],
  );

  return <FilterBar facets={scoped} groups={groups} sorts={PROFILE_SORTS} {...props} />;
}
