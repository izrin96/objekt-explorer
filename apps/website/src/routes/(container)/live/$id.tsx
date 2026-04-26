import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

import LiveStreamingRender from "@/components/live/live-render";
import { checkAccess, getLiveSessionById } from "@/lib/functions/live";

const liveSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/(container)/live/$id")({
  validateSearch: liveSearchSchema,
  beforeLoad: async ({ search }) => {
    const isAllowed = await checkAccess({ data: { token: search.token } });
    if (!isAllowed)
      throw redirect({
        to: "/live",
      });
  },
  loader: async ({ params }) => {
    const live = await getLiveSessionById({ data: { id: params.id } });
    return { live };
  },
  head: ({ loaderData }) => {
    const live = loaderData?.live;
    const title = live
      ? `${live.title} · Watch ${live.channel.name} live`
      : "Live · Objekt Tracker";
    return {
      meta: [{ title }],
    };
  },
  component: LiveDetailPage,
});

function LiveDetailPage() {
  const { live } = Route.useLoaderData();

  return (
    <div className="flex flex-col pt-2">
      <LiveStreamingRender live={live} />
    </div>
  );
}
