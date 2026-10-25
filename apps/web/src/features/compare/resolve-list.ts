import type { QueryClient } from "@tanstack/react-query";
import { isNotFound } from "@tanstack/react-router";

import { listBySlugQuery } from "@/features/list/queries";
import { profileQuery } from "@/features/profile/queries";

import type { ListInput } from "./list-target";

export type ResolvedList = { slug: string } | { error: "not_found" | "failed" };

/**
 * The ID compare takes, read back from the list itself: a profile-scoped link
 * names the list by its profile slug, and a mistyped ID should fail here, in
 * the dialog, not after it closes.
 */
export async function resolveListSlug(
  queryClient: QueryClient,
  input: ListInput,
): Promise<ResolvedList> {
  try {
    if ("slug" in input) {
      const list = await queryClient.fetchQuery(listBySlugQuery({ slug: input.slug }));
      return { slug: list.slug };
    }
    const profile = await queryClient.fetchQuery(profileQuery({ nickname: input.nickname }));
    const list = await queryClient.fetchQuery(
      listBySlugQuery({ slug: input.profileSlug, address: profile.address }),
    );
    return { slug: list.slug };
  } catch (error) {
    return { error: isNotFound(error) ? "not_found" : "failed" };
  }
}
