import { createFileRoute, redirect } from "@tanstack/react-router";

import LinkRender from "@/components/link/link-process";
import { getSession } from "@/lib/server/auth";

export const Route = createFileRoute("/_container/link/connect")({
  beforeLoad: async () => {
    const session = await getSession();
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
