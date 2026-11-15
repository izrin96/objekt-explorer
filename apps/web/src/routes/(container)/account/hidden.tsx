import { createFileRoute } from "@tanstack/react-router";

import { HiddenPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/hidden")({
  head: () => generateMetadata({ title: m.account_section_hidden() }),
  component: HiddenPanel,
});
