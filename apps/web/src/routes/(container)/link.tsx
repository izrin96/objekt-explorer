import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/link")({
  head: () => generateMetadata({ title: m.page_titles_my_cosmo_link() }),
  component: LinkPage,
});

function LinkPage() {
  return <PageHeader title={m.page_titles_my_cosmo_link()} />;
}
