import { useLocation } from "@tanstack/react-router";

/**
 * `/login` is a page like any other, so parking it as its own redirect would
 * only be undone by the sign-in guard a moment later.
 */
export function useSignInSearch(): { redirect: string | undefined } {
  const redirect = useLocation({ select: (s) => (s.pathname === "/login" ? undefined : s.href) });

  return { redirect };
}
