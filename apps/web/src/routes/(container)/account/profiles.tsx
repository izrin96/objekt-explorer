import { createFileRoute } from "@tanstack/react-router";

import { LinkedProfilesPanel, LinkedProfilesPending } from "@/features/link/linked-profiles";
import { linkedPreviewsOptions } from "@/features/link/queries";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/profiles")({
  loader: async ({ context: { queryClient } }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    // a failed preview read leaves the cards to fetch it again, not the page to fail
    await queryClient
      .query({
        ...linkedPreviewsOptions(user?.profiles.map((profile) => profile.address) ?? []),
        staleTime: "static",
      })
      .catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.account_section_profiles() }),
  component: LinkedProfilesPanel,
  pendingComponent: LinkedProfilesPending,
});
