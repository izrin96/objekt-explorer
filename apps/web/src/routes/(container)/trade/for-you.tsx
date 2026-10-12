import { createFileRoute, redirect } from "@tanstack/react-router";

import { forYouSearchSchema, forYouToBrowse } from "@/features/trade/browse-search";

/** For you lives in Browse now; old notifications, bookmarks and open tabs land there. */
export const Route = createFileRoute("/(container)/trade/for-you")({
  validateSearch: forYouSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/trade", search: forYouToBrowse(search), replace: true });
  },
});
