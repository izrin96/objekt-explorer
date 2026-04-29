import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import CompareView from "@/components/compare/compare-view";
import { ListProvider } from "@/hooks/use-list-target";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc/client";
import { listBySlugQuery } from "@/lib/queries/list";
import { compareInputSchema } from "@/lib/universal/compare";

export const Route = createFileRoute("/(container)/compare-tool")({
  validateSearch: compareInputSchema,
  loaderDeps: ({ search }) => ({
    sourceId: search.sourceId,
    targetType: search.targetType,
    targetProfile: search.targetProfile,
    targetListId: search.targetListId,
    mode: search.mode,
  }),
  errorComponent: ({ error }) => <ErrorComponent error={error.message} />,
  loader: async ({ deps, context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(listBySlugQuery({ slug: deps.sourceId })),
      queryClient.ensureQueryData(orpc.compare.compare.queryOptions({ input: deps })),
    ]);
    return { deps };
  },
  head: ({ loaderData }) => {
    const content = getIntlayer("page_titles");

    const sourceId = loaderData?.deps?.sourceId ?? "";
    const targetId = loaderData?.deps?.targetProfile ?? loaderData?.deps?.targetListId ?? "";

    return generateMetadata({
      title: content.compare_tool({ source: sourceId, target: targetId }).value,
    });
  },
  component: CompareToolPage,
});

function CompareToolPage() {
  const input = Route.useLoaderDeps();
  const { data: list } = useSuspenseQuery(listBySlugQuery({ slug: input.sourceId }));

  return (
    <ListProvider list={list}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <CompareView input={input} />
      </div>
    </ListProvider>
  );
}

function ErrorComponent({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <HeartBreakIcon size={64} weight="light" />
      <span className="font-medium">{error}</span>
    </div>
  );
}
