import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { AccountMenu } from "@/features/account/account-nav";
import { currentUserOptions } from "@/features/user/queries";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  component: AccountLayout,
});

function AccountLayout() {
  return (
    <>
      <PageHeader title={m.auth_account_title()} description={m.account_page_description()} />
      <div className="flex items-start gap-8">
        <AccountMenu className="sticky top-20 hidden w-52 shrink-0 md:block" />
        <div className="max-w-2xl min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </>
  );
}
