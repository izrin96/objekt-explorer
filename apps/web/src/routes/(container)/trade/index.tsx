import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(container)/trade/")({
  beforeLoad: () => {
    throw redirect({ to: "/trade/for-you", replace: true });
  },
});
