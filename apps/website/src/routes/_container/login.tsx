import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/login")({
  head: () => ({
    meta: [{ title: "Login · Objekt Tracker" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  return <div>Login</div>;
}
