import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/notifications")({
  head: () => generateMetadata({ title: m.notification_section() }),
  component: NotificationsPanel,
});
