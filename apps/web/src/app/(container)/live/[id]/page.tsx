import type { Metadata } from "next";

import { redirect } from "next/navigation";

import LiveStreamingRender from "@/components/live/live-render";
import { env } from "@/env";
import { getLiveSession } from "@/lib/client-fetching";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    token?: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const live = await getLiveSession(params.id);

  return {
    title: `${live.title} · ${live.channel.name} Live`,
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
      title: `${live.title} · ${live.channel.name} Live`,
      description: `${live.title} · Watch ${live.channel.name} live`,
      images: live.thumbnailImage ? [live.thumbnailImage] : undefined,
    },
  };
}

export default async function Page(props: Props) {
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
