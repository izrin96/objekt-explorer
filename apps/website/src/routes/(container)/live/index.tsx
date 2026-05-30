import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import { Note } from "@/components/intentui/note";
import LiveSessionListRender from "@/components/live/session-list";
import { checkAccess } from "@/lib/functions/live";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

const liveSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/(container)/live/")({
  validateSearch: liveSearchSchema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    const isAllowed = await checkAccess({ data: { token: deps.token } });
    return { isAllowed };
  },
  head: () => {
    return generateMetadata({ title: m.page_titles_live() });
  },
  component: LivePage,
});

function LivePage() {
  const { isAllowed } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-3">
      <Note>{m.live_tos_notice()}</Note>
      {isAllowed && <LiveSessionListRender />}
    </div>
  );
}
