import { createFileRoute, notFound } from "@tanstack/react-router";

import { NotFoundComponent } from "@/components/router/not-found";
import { profileQuery } from "@/features/profile/queries";

// Without this splat, an unknown sub-path falls through to the layout's
// `ProfileNotFound`, which claims the user does not exist
export const Route = createFileRoute("/@{$nickname}/$")({
  loader: async ({ params, context: { queryClient } }) => {
    await queryClient.query({
      ...profileQuery({ nickname: params.nickname }),
      staleTime: "static",
    });
    throw notFound();
  },
  notFoundComponent: NotFoundComponent,
});
