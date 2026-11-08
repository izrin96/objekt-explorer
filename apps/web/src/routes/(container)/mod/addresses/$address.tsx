import { isAddress } from "@repo/lib";
import { noop } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";

import { PageHeader } from "@/components/shared/page-header";
import {
  AddressHistory,
  AddressHistorySkeleton,
} from "@/features/moderation/console/address-history";
import { addressHistoryOptions } from "@/features/moderation/console/queries";
import { canOpenTab } from "@/features/moderation/staff-tabs";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/addresses/$address")({
  beforeLoad: ({ context: { viewerRole }, params }) => {
    if (!canOpenTab("addresses", viewerRole) || !isAddress(params.address)) throw notFound();
  },
  loader: async ({ context: { queryClient }, params }) => {
    await queryClient
      .query({ ...addressHistoryOptions(params.address), staleTime: "static" })
      .catch(noop);
  },
  head: () => generateMetadata({ title: m.mod_address_title() }),
  component: AddressPage,
  pendingComponent: AddressPending,
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

function AddressPending() {
  return (
    <>
      <PageHeader title={m.mod_address_title()} description={m.mod_address_description()} />
      <AddressHistorySkeleton />
    </>
  );
}
