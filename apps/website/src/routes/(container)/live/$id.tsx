import { LinkBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

import LiveStreamingRender from "@/components/live/live-render";
import { checkAccess, getLiveSessionById } from "@/lib/functions/live";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

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
  head: async ({ loaderData }) => {
    const live = loaderData?.live;
    if (!live) return {};

    const title = m.page_titles_live_detail({ title: live.title, channel: live.channel.name });

    return generateMetadata({
      title,
      openGraph: {
        description: `${live.title} · Watch ${live.channel.name} live`,
        images: live.thumbnailImage
          ? [
              {
                url: live.thumbnailImage,
              },
            ]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: `${live.title} · Watch ${live.channel.name} live`,
        images: live.thumbnailImage ? [live.thumbnailImage] : undefined,
      },
    });
  },
  notFoundComponent: NotFoundComponent,
  component: LiveDetailPage,
});

function LiveDetailPage() {
  const { live } = Route.useLoaderData();

  return <LiveStreamingRender live={live} />;
}

function NotFoundComponent() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <LinkBreakIcon size={72} weight="thin" />
      {m.not_found_live()}
    </div>
  );
}
