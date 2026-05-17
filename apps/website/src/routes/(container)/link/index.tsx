import { createFileRoute, redirect } from "@tanstack/react-router";

import MyLinkRender from "@/components/link/my-link";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc/client";
import { sessionOptions } from "@/lib/query-options";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/link/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(sessionOptions);
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpc.profile.list.queryOptions());
  },
  head: () => {
    return generateMetadata({ title: m.page_titles_my_cosmo_link() });
  },
  component: LinkPage,
});

function LinkPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">{m.link_my_cosmo()}</div>
        <MyLinkRender />
      </div>
    </div>
  );
}
