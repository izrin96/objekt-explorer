import { createFileRoute } from "@tanstack/react-router";

import { BlockedPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/blocked")({
  head: () => generateMetadata({ title: m.mod_blocked_title() }),
  component: BlockedPanel,
});
