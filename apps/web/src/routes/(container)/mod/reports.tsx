import { isStaffRole } from "@repo/api/schemas/moderation";
import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";

import { currentUserOptions } from "@/features/user/queries";

// not-found for everyone else, before any loader runs: the console's existence stays unconfirmed
export const Route = createFileRoute("/(container)/mod/reports")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user || !isStaffRole(user.user.role)) throw notFound();
    return { viewerRole: user.user.role ?? null };
  },
  component: Outlet,
});
