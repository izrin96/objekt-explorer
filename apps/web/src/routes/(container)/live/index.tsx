import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import { Note } from "@/components/shared/note";
import { LiveSessionList } from "@/features/live/session-list";
import { checkAccess } from "@/lib/functions/live";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/live/")({
  validateSearch: z.object({ token: z.string().optional() }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => ({ isAllowed: await checkAccess({ data: { token: deps.token } }) }),
  head: () => generateMetadata({ title: m.page_titles_live() }),
  component: LivePage,
});

function LivePage() {
  const { isAllowed } = Route.useLoaderData();
  const { token } = Route.useSearch();

  return (
    <>
      <Note>{m.live_tos_notice()}</Note>
      {isAllowed && <LiveSessionList token={token} />}
    </>
  );
}
