import { roleList } from "@repo/api/schemas/moderation";
import { createFileRoute, notFound } from "@tanstack/react-router";
import * as z from "zod";

import { ModAccount, ModAccountSkeleton } from "@/features/moderation/console/account";
import { accountOptions } from "@/features/moderation/console/queries";
import { generateMetadata } from "@/lib/meta";
import { isNotFound } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  report: z.coerce.number().int().positive().optional().catch(undefined),
});

export const Route = createFileRoute("/(container)/mod/reports/$userId")({
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient
      .query({ ...accountOptions(params.userId), staleTime: "static" })
      .catch((error: unknown) => {
        if (isNotFound(error)) throw notFound();
      });
  },
  head: () => generateMetadata({ title: m.page_titles_mod_reports() }),
  component: AccountPage,
  pendingComponent: ModAccountSkeleton,
});

function AccountPage() {
  const { userId } = Route.useParams();
  const { report } = Route.useSearch();
  const { viewerRole } = Route.useRouteContext();
  return (
    <ModAccount
      userId={userId}
      selectedReport={report}
      viewerIsAdmin={roleList(viewerRole).includes("admin")}
    />
  );
}
