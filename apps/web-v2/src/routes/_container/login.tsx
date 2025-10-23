import { createFileRoute } from "@tanstack/react-router";
import SignIn from "@/components/auth/sign-in";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/login")({
  component: RouteComponent,
  head: () => ({
    meta: seo({ title: "Sign in" }),
  }),
});

function RouteComponent() {
  return <SignIn />;
}
