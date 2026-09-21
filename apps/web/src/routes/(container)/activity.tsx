import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/activity")({
  head: () => generateMetadata({ title: m.activity_title() }),
  component: ActivityPage,
});

function ActivityPage() {
  return <PageHeader title={m.activity_title()} />;
}
