import { noop } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  CollectionDataPanel,
  CollectionDataPending,
} from "@/features/cosmo-session/collection-data-panel";
import { cosmoSessionsOptions } from "@/features/cosmo-session/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/collection-data")({
  loader: async ({ context: { queryClient } }) => {
    // a failed read leaves the panel to say so and offer a retry, not the page to fail
    await queryClient.query({ ...cosmoSessionsOptions, staleTime: "static" }).catch(noop);
  },
  head: () => generateMetadata({ title: m.account_section_collection_data() }),
  component: CollectionDataPanel,
  pendingComponent: CollectionDataPending,
});
