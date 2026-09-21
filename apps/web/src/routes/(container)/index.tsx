import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/")({
  component: HomePage,
});

function HomePage() {
  return <PageHeader title={m.home_title()} description={m.home_description()} />;
}
