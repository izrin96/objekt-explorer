import { createFileRoute } from "@tanstack/react-router";

import { SignInPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/sign-in")({
  head: () => generateMetadata({ title: m.account_section_sign_in() }),
  component: SignInPanel,
});
