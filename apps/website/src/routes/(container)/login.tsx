import { createFileRoute } from "@tanstack/react-router";

import SignIn from "@/components/auth/sign-in";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/login")({
  head: () => {
    return generateMetadata({ title: m.page_titles_login() });
  },
  component: LoginPage,
});

function LoginPage() {
  return <SignIn />;
}
