import { createFileRoute, notFound } from "@tanstack/react-router";

import { PasswordPanel } from "@/features/account/panels";
import { accountsOptions, hasPassword } from "@/features/account/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/password")({
  // the account list comes from the auth client, which only has the session in the browser
  ssr: false,
  beforeLoad: async ({ context: { queryClient } }) => {
    const accounts = await queryClient.query({ ...accountsOptions, staleTime: "static" });
    if (!hasPassword(accounts)) throw notFound();
  },
  head: () => generateMetadata({ title: m.account_section_password() }),
  component: PasswordPanel,
});
