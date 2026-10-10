import { createFileRoute } from "@tanstack/react-router";

import { AccountSectionList } from "@/features/account/account-nav";
import { GeneralPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/")({
  head: () => generateMetadata({ title: m.auth_account_title() }),
  component: AccountIndex,
});

/** The viewport is unknown to the server render, so both views render and CSS picks one. */
function AccountIndex() {
  return (
    <>
      <AccountSectionList className="md:hidden" />
      <div className="hidden md:block">
        <GeneralPanel />
      </div>
    </>
  );
}
