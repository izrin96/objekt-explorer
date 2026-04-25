import { createFileRoute, redirect } from "@tanstack/react-router";

import LinkRender from "@/components/link/link-process";
import { orpc } from "@/lib/orpc/client";

export const Route = createFileRoute("/_container/link/connect")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(orpc.user.session.queryOptions());
    if (!session) {
      throw redirect({ to: "/" });
    }
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
