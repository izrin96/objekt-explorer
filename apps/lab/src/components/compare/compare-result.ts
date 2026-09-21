import { useMemo } from "react";

import type { ActiveCompare } from "@/components/compare/compare-filters";
import { getProfile } from "@/components/profile/profile-data";
import { type LabObjekt, objektById } from "@/fixtures/objekts";
import { users } from "@/fixtures/users";
import { useCosmoLinks } from "@/store/link";
import { useLists } from "@/store/lists";
import { useSession } from "@/store/session";

/** `api_errors_compare_*` in `apps/website/messages/en.json`, verbatim */
export const COMPARE_ERRORS = {
  profile: "Target profile not found",
  list: "Target list not found",
} as const;

export type CompareResult = { ok: true; objekts: LabObjekt[] } | { ok: false; message: string };

/** `cmp_to` is whatever was typed: a Cosmo ID in any casing, or an address */
function findNickname(target: string): string | null {
  const needle = target.trim().toLowerCase();
  if (needle === "") return null;
  const user = users.find(
    (u) => u.nickname.toLowerCase() === needle || u.address.toLowerCase() === needle,
  );
  return user?.nickname ?? null;
}

/**
 * `performComparison` from `lib/server/api/routers/compare.ts`, client side: the
 * source list's entries against the target's collections, keyed on the
 * collection slug. `missing` is "in source, not in target"; `matches` is the
 * intersection. An owned objekt's `id` carries its serial, so `slug` is the
 * only field the two sides can be compared on.
 */
function performComparison(
  source: LabObjekt[],
  target: LabObjekt[],
  mode: ActiveCompare["cmp_mode"],
): LabObjekt[] {
  const targetSlugs = new Set(target.map((o) => o.slug));
  return mode === "missing"
    ? source.filter((o) => !targetSlugs.has(o.slug))
    : source.filter((o) => targetSlugs.has(o.slug));
}

/**
 * The comparison the list view renders instead of its own entries. `compare`
 * is null while the three params are not all set, and the hook still runs —
 * resolving the target is a `useMemo`, not a branch above the hooks.
 *
 * The app returns `[]` (not an error) for a target profile the viewer may not
 * see. The lab's only privacy flag lives on a *linked* Cosmo, and every link in
 * `store/link.ts` belongs to the signed-in account, so the app's
 * `session.user.id !== profile.userId` test is "nobody is signed in" here.
 */
export function useCompareResult(
  source: LabObjekt[],
  compare: ActiveCompare | null,
): CompareResult | null {
  const lists = useLists((s) => s.lists);
  const links = useCosmoLinks((s) => s.links);
  const signedIn = useSession((s) => s.signedIn);

  return useMemo(() => {
    if (compare === null) return null;

    if (compare.cmp_type === "profile") {
      const nickname = findNickname(compare.cmp_to);
      if (nickname === null) return { ok: false, message: COMPARE_ERRORS.profile };

      const link = links.find((l) => l.nickname.toLowerCase() === nickname.toLowerCase());
      const hidden = link?.privateProfile === true && !signedIn;
      const target = hidden ? [] : getProfile(nickname).objekts;
      return { ok: true, objekts: performComparison(source, target, compare.cmp_mode) };
    }

    const list = lists.find((l) => l.id === compare.cmp_to.trim());
    if (!list) return { ok: false, message: COMPARE_ERRORS.list };

    const target = list.entries
      .map((entry) => objektById.get(entry.objektId))
      .filter((objekt): objekt is LabObjekt => objekt !== undefined);
    return { ok: true, objekts: performComparison(source, target, compare.cmp_mode) };
  }, [source, compare, lists, links, signedIn]);
}
