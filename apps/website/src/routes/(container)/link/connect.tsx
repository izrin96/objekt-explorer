import { createFileRoute, redirect } from "@tanstack/react-router";

import LinkRender from "@/components/link/link-process";
import { generateMetadata } from "@/lib/meta";
import { currentUserOptions } from "@/lib/query-options";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/link/connect")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(currentUserOptions);
    if (!user) {
      throw redirect({ to: "/" });
    }
  },
  head: () => {
    return generateMetadata({ title: m.page_titles_my_cosmo_link() });
  },
  component: LinkConnectPage,
});

function LinkConnectPage() {
  return (
    <div className="flex flex-col">
      <LinkRender />
    </div>
  );
}
