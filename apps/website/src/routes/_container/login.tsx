import { createFileRoute } from "@tanstack/react-router";

import SignIn from "@/components/auth/sign-in";

export const Route = createFileRoute("/_container/login")({
  head: () => ({
    meta: [{ title: "Login · Objekt Tracker" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  return <SignIn />;
}
