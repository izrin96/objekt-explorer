import { createFileRoute, redirect } from "@tanstack/react-router";
import { getIntlayer, useIntlayer } from "react-intlayer";

import MyLinkRender from "@/components/link/my-link";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc/client";
import { sessionOptions } from "@/lib/query-options";

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
    const content = getIntlayer("page_titles");
    return generateMetadata({ title: content.my_cosmo_link.value });
  },
  component: LinkPage,
});

function LinkPage() {
  const content = useIntlayer("link");

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">{content.my_cosmo.value}</div>
        <MyLinkRender />
      </div>
    </div>
  );
}
