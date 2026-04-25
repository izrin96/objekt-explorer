import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import LiveStreamingRender from "@/components/live/live-render";
import { getLiveSessionById } from "@/lib/server/functions/live.server";

const liveDetailSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/_container/live/$id")({
  validateSearch: liveDetailSearchSchema,
  loaderDeps: ({ search }) => {
    return search;
  },
  loader: async ({ params, deps }) => {
    if (!deps.token) throw redirect({ to: "/live" });
    const live = await getLiveSessionById({ data: { id: params.id } });
    return { live };
  },
  head: ({ loaderData }) => {
    const live = loaderData?.live;
    const title = live
      ? `${live.title} · Watch ${live.channel.name} live`
      : "Live · Objekt Tracker";
    return {
      meta: [
        { title },
        { name: "description", content: title },
        { property: "og:title", content: title },
        { property: "og:description", content: title },
        ...(live?.thumbnailImage ? [{ property: "og:image", content: live.thumbnailImage }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: title },
        ...(live?.thumbnailImage ? [{ name: "twitter:image", content: live.thumbnailImage }] : []),
      ],
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
