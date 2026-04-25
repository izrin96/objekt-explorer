import { createFileRoute, redirect } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import MyLinkRender from "@/components/link/my-link";

export const Route = createFileRoute("/_container/link/")({
  head: () => ({
    meta: [{ title: "My Cosmo Link · Objekt Tracker" }],
  }),
  beforeLoad: async ({ context: { queryClient, orpc } }) => {
    const session = await queryClient.ensureQueryData(orpc.user.session.queryOptions());
    if (!session) {
      throw redirect({ to: "/" });
    }
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
