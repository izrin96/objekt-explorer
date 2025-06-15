import LiveStreamingRender from "@/components/live/live-render";
import { getLiveSession } from "@/lib/client-fetching";
import { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const live = await getLiveSession(params.id);

  if (!live) notFound();

  return {
    title: `${live.title} · ${live.channel.name} Live`,
  };
}

export default async function Page(props: Props) {
  const params = await props.params;
  const live = await getLiveSession(params.id);

  if (!live) notFound();

  return (
    <div className="flex flex-col pt-2">
      <LiveStreamingRender live={live} />
    </div>
  );
}
