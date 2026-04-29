import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import SignIn from "@/components/auth/sign-in";
import { generateMetadata } from "@/lib/meta";

export const Route = createFileRoute("/(container)/login")({
  head: () => {
    const content = getIntlayer("page_titles");
    return generateMetadata({ title: content.login.value });
  },
  component: LoginPage,
});

function LoginPage() {
  return <SignIn />;
}
