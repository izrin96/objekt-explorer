import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
import * as z from "zod";

import { LiveNotFound } from "@/features/live/live-not-found";
import { checkAccess, getLiveSessionById } from "@/lib/functions/live";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/live/$id")({
  validateSearch: z.object({ token: z.string().optional().catch(undefined) }),
  beforeLoad: async ({ search }) => {
    const isAllowed = await checkAccess({ data: { token: search.token } });
    if (!isAllowed) throw redirect({ to: "/live" });
  },
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ params, deps }) => ({
    live: await getLiveSessionById({ data: { id: params.id, token: deps.token } }),
  }),
  head: ({ loaderData }) => {
    const live = loaderData?.live;
    if (!live) return {};

    const title = m.page_titles_live_detail({ title: live.title, channel: live.channel.name });
    const description = m.page_titles_live_og_description({
      title: live.title,
      channel: live.channel.name,
    });
    const images = live.thumbnailImage ? [live.thumbnailImage] : undefined;

    return generateMetadata({
      title,
      openGraph: { description, images: images?.map((url) => ({ url })) },
      twitter: { card: "summary_large_image", title, description, images },
    });
  },
  notFoundComponent: LiveNotFound,
  // keeps the Stream SDK out of every other route's bundle
  component: lazyRouteComponent(() => import("@/features/live/player")),
});
