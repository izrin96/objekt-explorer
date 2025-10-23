import { ImageBrokenIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { TargetProvider } from "@/hooks/use-target";
import { UserProvider } from "@/hooks/use-user";
import { orpc } from "@/lib/orpc/client";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/list/$slug")({
  component: RouteComponent,
  loader: async ({ context, params: { slug } }) => {
    const list = await context.queryClient.ensureQueryData(
      context.orpc.list.findPublic.queryOptions({ input: { slug } }),
    );

    // prefetch
    context.queryClient.prefetchQuery(
      context.orpc.list.findPublic.queryOptions({ input: { slug } }),
    );
    context.queryClient.prefetchQuery(context.orpc.list.list.queryOptions());
    context.queryClient.prefetchQuery(
      context.orpc.list.listEntries.queryOptions({ input: { slug } }),
    );

    return { list };
  },
  notFoundComponent: () => <NotFound />,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: `${loaderData.list.name}${loaderData.list.user ? ` · ${loaderData.list.user.name}'s` : ""} list`,
        })
      : undefined,
  }),
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const [{ data: list }, { data: lists }] = useSuspenseQueries({
    queries: [
      orpc.list.findPublic.queryOptions({ input: { slug } }),
      orpc.list.list.queryOptions(),
    ],
  });
  return (
    <UserProvider lists={lists}>
      <TargetProvider list={list}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ListHeader />
          <ListRender />
        </div>
      </TargetProvider>
    </UserProvider>
  );
}

function NotFound() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <ImageBrokenIcon size={72} weight="thin" />
      List not found
    </div>
  );
}
