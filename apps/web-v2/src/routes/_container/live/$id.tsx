import { LinkBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import LiveStreamingRender from "@/components/live/live-render";
import { orpc } from "@/lib/orpc/client";
import { seo } from "@/lib/seo";
import { fetchIsBypass, searchSchema } from ".";

export const Route = createFileRoute("/_container/live/$id")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { token } }) => ({ token }),
  loader: async ({ params: { id }, deps, context }) => {
    const live = await context.queryClient.ensureQueryData(
      context.orpc.liveSession.find.queryOptions({ input: { id } }),
    );

    // prefetch
    context.queryClient.prefetchQuery(
      context.orpc.liveSession.find.queryOptions({ input: { id } }),
    );

    const isBypass = await fetchIsBypass({ data: { token: deps.token } });
    if (!isBypass) {
      throw redirect({
        to: "/live",
      });
    }

    return { live };
  },
  notFoundComponent: () => <NotFound />,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({ title: `${loaderData.live.title} · ${loaderData.live.channel.name} live` })
      : undefined,
  }),
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data: live } = useSuspenseQuery(orpc.liveSession.find.queryOptions({ input: { id } }));

  return (
    <div className="flex flex-col pt-2">
      <LiveStreamingRender live={live} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <LinkBreakIcon size={72} weight="thin" />
      Live not found
    </div>
  );
}
