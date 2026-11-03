import { useLocation } from "@tanstack/react-router";

import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

export function useNavLinks() {
  const { data: user } = useCurrentUser();
  const links = [
    { key: "home", label: m.home_title(), to: "/", exact: true },
    { key: "market", label: m.nav_market(), to: "/market", exact: false },
    { key: "trade", label: m.nav_trade(), to: "/trade", exact: false },
    { key: "activity", label: m.nav_activity(), to: "/activity", exact: false },
    // `/list/{slug}` is any user's list, not one of the viewer's own
    { key: "list", label: m.nav_my_list(), to: "/list", exact: true },
    // the link flow at `/link/connect` still belongs to Profiles
    {
      key: "link",
      label: m.nav_my_cosmo_link(),
      to: "/account/profiles",
      exact: false,
      also: "/link",
    },
  ] as const;
  // `/list` and Profiles are the signed-in user's own; signed out they only bounce to /login
  return user ? links : links.filter((link) => link.key !== "list" && link.key !== "link");
}

export type NavLink = ReturnType<typeof useNavLinks>[number];

/** Whether a link counts as current under its `also` prefix, beside its own path. */
export function useAlsoActive() {
  const pathname = useLocation({ select: (s) => s.pathname });
  return (link: NavLink) =>
    "also" in link && (pathname === link.also || pathname.startsWith(`${link.also}/`));
}
