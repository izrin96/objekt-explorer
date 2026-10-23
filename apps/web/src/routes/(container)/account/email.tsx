import { createFileRoute } from "@tanstack/react-router";

import { EmailPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/email")({
  head: () => generateMetadata({ title: m.auth_account_email_label() }),
  component: EmailPanel,
});
