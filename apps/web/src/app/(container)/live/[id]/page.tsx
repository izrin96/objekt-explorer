import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";
import { redirect } from "next/navigation";

import { LiveStreamingRender } from "@/components/live/live-render";
import { getLiveSession } from "@/lib/data-fetching";
import { env } from "@/lib/env";

export async function generateMetadata(props: PageProps<"/live/[id]">): Promise<Metadata> {
  const params = await props.params;
  const live = await getLiveSession(params.id);
  const content = useIntlayer("page_titles");

  const title = content.live_detail({ title: live.title, channel: live.channel.name }).value;

  return {
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
  };
}

export default async function Page(props: PageProps<"/live/[id]">) {
  const [searchParams, params] = await Promise.all([props.searchParams, props.params]);
  const token = searchParams?.token ?? "";

  if (token !== env.BYPASS_LIVE_KEY) {
    redirect("/live");
  }

  const live = await getLiveSession(params.id);

  return (
    <div className="flex flex-col pt-2">
      <LiveStreamingRender live={live} />
    </div>
  );
}
