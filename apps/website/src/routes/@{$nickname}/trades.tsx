import { createFileRoute } from "@tanstack/react-router";

import ProfileTradesRender from "@/components/profile/trades/profile-trades";

export const Route = createFileRoute("/@{$nickname}/trades")({
  head: () => ({
    meta: [{ title: "Trades · Objekt Tracker" }],
  }),
  component: ProfileTradesPage,
});

function ProfileTradesPage() {
  return <ProfileTradesRender />;
}
