import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/list")({
  head: () => generateMetadata({ title: m.list_title() }),
  component: ListPage,
});

function ListPage() {
  return <PageHeader title={m.list_title()} />;
}
