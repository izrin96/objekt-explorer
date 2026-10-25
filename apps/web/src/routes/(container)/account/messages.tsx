import { createFileRoute } from "@tanstack/react-router";

import { MessagesPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/messages")({
  head: () => generateMetadata({ title: m.chat_settings_tab() }),
  component: MessagesPanel,
});
