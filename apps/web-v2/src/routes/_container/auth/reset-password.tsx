import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import ResetPassword from "@/components/auth/reset-password";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/auth/reset-password")({
  component: RouteComponent,
  validateSearch: z.object({
    token: z.string(),
  }),
  head: () => ({
    meta: seo({ title: "Reset password" }),
  }),
});

function RouteComponent() {
  const searchParams = Route.useSearch();
  return <ResetPassword token={searchParams.token} />;
}
