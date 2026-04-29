import { createFileRoute, redirect } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import MyListRender from "@/components/list/my-list";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc/client";
import { sessionOptions } from "@/lib/query-options";

export const Route = createFileRoute("/(container)/list/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(sessionOptions);
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  loader: ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery(orpc.list.list.queryOptions());
  },
  head: () => {
    const content = getIntlayer("page_titles");
    return generateMetadata({ title: content.my_list.value });
  },
  component: ListPage,
  ssr: "data-only",
});

function ListPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <MyListRender />
    </div>
  );
}
