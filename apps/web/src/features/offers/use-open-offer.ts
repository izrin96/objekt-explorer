import { useNavigate, useRouter } from "@tanstack/react-router";

import { useStartGate } from "@/features/user/start-gate";

import { offerLink, type OfferStart } from "./offer-link";
import { forgetOpener, rememberOpener } from "./return-focus";

/**
 * Opens the offer page from a menu item or a drawer, where a link can't be; `from` is this page
 * unless set. `opener` names the control that takes focus again on Back, when there is one.
 */
export function useOpenOffer() {
  const { gate } = useStartGate();
  const navigate = useNavigate();
  const router = useRouter();
  return (start: OfferStart, opener?: string) => {
    if (!gate()) return;
    if (opener) rememberOpener(opener);
    else forgetOpener();
    void navigate(offerLink({ ...start, from: start.from ?? router.state.location.href }));
  };
}
