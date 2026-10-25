import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(container)/link/")({
  beforeLoad: () => {
    throw redirect({ to: "/account/profiles", replace: true });
  },
});
