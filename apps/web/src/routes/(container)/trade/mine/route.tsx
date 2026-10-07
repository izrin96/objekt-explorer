import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { currentUserOptions } from "@/features/user/queries";

export const Route = createFileRoute("/(container)/trade/mine")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: Outlet,
});
