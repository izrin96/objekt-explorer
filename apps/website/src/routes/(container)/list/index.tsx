import { createFileRoute, redirect } from "@tanstack/react-router";

import MyListRender from "@/components/list/my-list";
import { generateMetadata } from "@/lib/meta";
import { currentUserOptions } from "@/lib/query-options";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/list/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(currentUserOptions);
    if (!user) {
      throw redirect({ to: "/" });
    }
  },
  head: () => {
    return generateMetadata({ title: m.page_titles_my_list() });
  },
  component: ListPage,
});

function ListPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <MyListRender />
    </div>
  );
}
