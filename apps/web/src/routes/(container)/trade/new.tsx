import { createFileRoute } from "@tanstack/react-router";

import { composerSearchSchema, resolveStart } from "@/features/trade/composer/link";
import { ComposerPage } from "@/features/trade/composer/page";
import { toPlanList } from "@/features/trade/post-plan";
import { currentUserOptions, requireSignedIn } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/new")({
  staticData: { tradeChrome: false },
  validateSearch: composerSearchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ context, location }) => requireSignedIn({ context, location }),
  // the start is checked against the viewer's own lists here, so the title follows what opens
  loader: async ({ context: { queryClient }, deps }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    return { start: resolveStart(deps, (user?.lists ?? []).map(toPlanList)) };
  },
  head: ({ loaderData }) =>
    generateMetadata({
      title: loaderData?.start.replaces ? m.trade_composer_edit_title() : m.trade_new_post(),
    }),
  component: ComposerRoute,
});

function ComposerRoute() {
  const search = Route.useSearch();
  const { start } = Route.useLoaderData();
  return (
    <ComposerPage
      key={JSON.stringify(search)}
      start={start}
      from={search.from}
      staleEdit={search.edit !== undefined && start.replaces === null}
    />
  );
}
