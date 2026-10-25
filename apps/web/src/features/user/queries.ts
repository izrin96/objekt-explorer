import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { orpc } from "@/lib/orpc";

export const currentUserOptions = orpc.user.currentUser.queryOptions({
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});

/** A route's `beforeLoad` for signed-in pages: off to login, coming back here after. */
export async function requireSignedIn({
  context: { queryClient },
  location,
}: {
  context: { queryClient: QueryClient };
  location: { href: string };
}) {
  const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
  if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
}
