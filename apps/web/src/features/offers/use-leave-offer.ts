import { useLocation, useRouter } from "@tanstack/react-router";

import { armReturn, disarmReturn } from "./return-focus";

/**
 * Back and Cancel. Opened from inside the app, the page steps back through history, so a feed
 * comes back scrolled as it was and its opener takes focus; else it is replaced with `backHref`.
 */
export function useLeaveOffer(backHref: string) {
  const router = useRouter();
  const openedInApp = useLocation({ select: (location) => location.state.offerBack === true });
  return () => {
    armReturn();
    // the landing page's openers look once, as it draws; one drawn later must not take focus
    const stop = router.subscribe("onResolved", () => {
      stop();
      requestAnimationFrame(() => requestAnimationFrame(disarmReturn));
    });
    if (openedInApp && router.history.canGoBack()) router.history.back();
    else router.history.replace(backHref);
  };
}
