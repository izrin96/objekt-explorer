import type { ComposerStart } from "@repo/api/schemas/trade-post";
import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

import { composerSearch } from "./link";

/** Opens `/trade/new` on a start, returning after Post to the page it was opened from. */
export function useOpenComposer() {
  const router = useRouter();
  return useCallback(
    (start: ComposerStart) =>
      void router.navigate({
        to: "/trade/new",
        search: composerSearch(start, router.state.location.href),
        state: { composerBack: true },
      }),
    [router],
  );
}
