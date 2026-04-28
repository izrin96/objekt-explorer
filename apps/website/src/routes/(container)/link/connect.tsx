import { createFileRoute, redirect } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import LinkRender from "@/components/link/link-process";
import { generateMetadata } from "@/lib/meta";
import { sessionOptions } from "@/lib/query-options";

export const Route = createFileRoute("/(container)/link/connect")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(sessionOptions);
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  head: () => {
    const content = getIntlayer("page_titles");
    return generateMetadata({ title: content.my_cosmo_link.value });
  },
  component: LinkConnectPage,
});

function LinkConnectPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <LinkRender />
    </div>
  );
}
