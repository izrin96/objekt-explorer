import { createFileRoute, redirect } from "@tanstack/react-router";

import MyLinkRender from "@/components/link/my-link";
import { generateMetadata } from "@/lib/meta";
import { currentUserOptions } from "@/lib/query-options";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/link/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(currentUserOptions);
    if (!user) {
      throw redirect({ to: "/" });
    }
  },
  head: () => {
    return generateMetadata({ title: m.page_titles_my_cosmo_link() });
  },
  component: LinkPage,
});

function LinkPage() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        <div className="font-display text-xl font-semibold">{m.link_my_cosmo()}</div>
        <MyLinkRender />
      </div>
    </div>
  );
}
