import { isStaffRole } from "@repo/api/schemas/moderation";
import { isAddress } from "@repo/lib";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import { AddressHistory } from "@/features/moderation/console/address-history";
import { addressHistoryOptions } from "@/features/moderation/console/queries";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

// not-found for everyone else, before any loader runs: the console's existence stays unconfirmed
export const Route = createFileRoute("/(container)/mod/addresses/$address")({
  beforeLoad: async ({ context: { queryClient }, params }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user || !isStaffRole(user.user.role) || !isAddress(params.address)) throw notFound();
  },
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient
      .query({ ...addressHistoryOptions(params.address), staleTime: "static" })
      .catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.mod_address_title() }),
  component: AddressPage,
});

function AddressPage() {
  const { address } = Route.useParams();
  return (
    <>
      <PageHeader title={m.mod_address_title()} description={m.mod_address_description()} />
      <AddressHistory address={address} />
    </>
  );
}
