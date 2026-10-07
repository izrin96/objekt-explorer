import { createFileRoute } from "@tanstack/react-router";

import { DangerPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/danger")({
  head: () => generateMetadata({ title: m.auth_account_danger_zone() }),
  component: DangerPanel,
});
