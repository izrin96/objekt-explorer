import { Outlet, createFileRoute } from "@tanstack/react-router";

import { requireSignedIn } from "@/features/user/queries";

export const Route = createFileRoute("/(container)/trade/mine")({
  beforeLoad: requireSignedIn,
  component: Outlet,
});
