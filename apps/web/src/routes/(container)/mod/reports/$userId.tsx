import { roleList } from "@repo/api/schemas/moderation";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { isNotFound } from "@/features/chat/queries";
import { ModAccount } from "@/features/moderation/mod-account";
import { accountOptions } from "@/features/moderation/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/reports/$userId")({
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient
      .query({ ...accountOptions(params.userId), staleTime: "static" })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw notFound();
      });
  },
  head: () => generateMetadata({ title: m.page_titles_mod_reports() }),
  component: AccountPage,
});

function AccountPage() {
  const { userId } = Route.useParams();
  const { viewerRole } = Route.useRouteContext();
  return <ModAccount userId={userId} viewerIsAdmin={roleList(viewerRole).includes("admin")} />;
}
