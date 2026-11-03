import { useNavigate, useLocation } from "@tanstack/react-router";

import { useCurrentUser } from "@/features/user/hooks";
import { addActionToast } from "@/lib/action-toast";
import { m } from "@/paraglide/messages";

/**
 * What starting a conversation needs before any request: a session, and a linked Cosmo
 * profile. `gate` sends the visitor where they can get the missing one and says whether to go on.
 */
export function useStartGate() {
  const { data: current } = useCurrentUser();
  const navigate = useNavigate();
  const href = useLocation({ select: (location) => location.href });

  const offerLink = () => {
    addActionToast(
      // it carries the only way forward, so it stays until dismissed
      { type: "info", title: m.chat_refused_no_address(), timeout: 0 },
      { label: m.link_link_cosmo(), onClick: () => void navigate({ to: "/account/profiles" }) },
    );
  };

  const gate = () => {
    if (!current) {
      void navigate({ to: "/login", search: { redirect: href } });
      return false;
    }
    if (current.profiles.length === 0) {
      offerLink();
      return false;
    }
    return true;
  };

  return { gate, offerLink };
}
