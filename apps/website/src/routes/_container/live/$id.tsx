import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import LiveStreamingRender from "@/components/live/live-render";

const liveDetailSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/_container/live/$id")({
  validateSearch: liveDetailSearchSchema,
  loader: async ({ context: { orpc }, params: { id } }) => {
    const live = await orpc.live.get.call({ id });
    return { live };
  },
  head: () => ({
    meta: [{ title: "Live · Objekt Tracker" }],
  }),
  component: LiveDetailPage,
});

function LiveDetailPage() {
  const { live } = Route.useLoaderData();
  const { token } = Route.useSearch();

  if (!token) {
    // todo: move to serverFn
    throw redirect({ to: "/live" });
  }

  return (
    <div className="flex flex-col pt-2">
      <LiveStreamingRender live={live} />
    </div>
  );
}
