import { createFileRoute, redirect } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { LinkFlow } from "@/features/link/link-flow";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/link/connect")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  head: () => generateMetadata({ title: m.link_link_cosmo() }),
  component: LinkConnectPage,
});

function LinkConnectPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4.5 sm:pt-6">
      <PageHeader title={m.link_link_cosmo()} />
      <LinkFlow />
    </div>
  );
}
