import { createFileRoute, notFound } from "@tanstack/react-router";

import { NotFoundComponent } from "@/components/router/not-found";
import { loadProfile } from "@/features/profile/tab-route";

// Without this splat, an unknown sub-path falls through to the layout's
// `ProfileNotFound`, which claims the user does not exist
export const Route = createFileRoute("/@{$nickname}/$")({
  loader: async (match) => {
    await loadProfile(match);
    throw notFound();
  },
  notFoundComponent: NotFoundComponent,
});
