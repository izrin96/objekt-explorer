import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

import { currentUserOptions } from "@/features/user/queries";
import { isSafeRedirect } from "@/lib/utils";

/**
 * Where a successful sign-in or sign-up lands. `redirect` is a built href, not
 * one of the registered paths, so it goes through `history.push` rather than
 * `navigate({ to })` — TanStack's own authenticated-route pattern.
 */
export function useAuthSuccess(redirect: string | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey });
    if (redirect !== undefined && isSafeRedirect(redirect)) router.history.push(redirect);
    else await router.navigate({ to: "/" });
  }, [queryClient, redirect, router]);
}
