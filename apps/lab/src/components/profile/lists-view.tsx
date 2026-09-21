import { RectangleDashedIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import type { Profile } from "@/components/profile/profile-data";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { type LabList, LIST_TYPE_LABEL, LIST_TYPE_VARIANT, useLists } from "@/store/lists";

/**
 * The lists a profile's Lists tab shows: filed under that Cosmo **and** marked
 * for display on it.
 *
 * The app carries the two as separate columns, and this is the surface where
 * the second one is the test: `/list`'s cards and the list header key off
 * `profileNickname` alone (which Cosmo owns the list), while the profile tab
 * keys off `isProfileBind` as well (whether that Cosmo displays it). `have 3`
 * is seeded with the first and not the second precisely so this tab can be
 * seen leaving it out.
 */
function profileLists(lists: readonly LabList[], nickname: string): LabList[] {
  return lists.filter((l) => l.profileNickname === nickname && l.isProfileBind);
}

/**
 * Shared by the tab strip's badge and by this view, so the number on the tab
 * and the number of cards under it cannot disagree. The filtering is memoised
 * rather than done inside the selector: zustand v5 compares snapshots by
 * identity, and a selector that builds a fresh array every call never settles.
 */
export function useProfileLists(nickname: string): LabList[] {
  const lists = useLists((s) => s.lists);
  return useMemo(() => profileLists(lists, nickname), [lists, nickname]);
}

export function ListsView({ profile }: { profile: Profile }) {
  const lists = useProfileLists(profile.nickname);

  if (lists.length === 0) {
    return (
      <EmptyState
        icon={RectangleDashedIcon}
        /** list_no_lists_found */
        title="No lists found for this profile"
        hint={`${profile.nickname} has no list set to show here. A list is filed under a Cosmo and then displayed on it — the two are separate switches on the list form.`}
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-2">
      {lists.map((list) => (
        <Link
          key={list.id}
          to="/list/$slug"
          params={{ slug: list.id }}
          className="bg-popover hover:bg-secondary/60 flex flex-col gap-1.5 rounded-lg border p-4 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-[15px] font-semibold">{list.name}</h3>
            {/* every list is *something*, so "General" says nothing the card
                does not already say; the website hides it the same way */}
            {list.type !== "general" && (
              <Badge variant={LIST_TYPE_VARIANT[list.type]} size="sm">
                {LIST_TYPE_LABEL[list.type]}
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground text-[12.5px]">
            <span className="font-mono">{list.entries.length}</span> objekts
          </div>
        </Link>
      ))}
    </div>
  );
}
