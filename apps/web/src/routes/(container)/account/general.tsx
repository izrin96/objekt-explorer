import { createFileRoute } from "@tanstack/react-router";

import { GeneralPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/general")({
  head: () => generateMetadata({ title: m.auth_account_general() }),
  component: GeneralPanel,
});
