import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => generateMetadata({ title: m.page_titles_login() }),
  component: LoginPage,
});

function LoginPage() {
  return <PageHeader title={m.page_titles_login()} />;
}
