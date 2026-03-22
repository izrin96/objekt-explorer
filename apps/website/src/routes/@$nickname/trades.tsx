import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@$nickname/trades")({
  head: () => ({
    meta: [{ title: "Trades · Objekt Tracker" }],
  }),
  component: ProfileTradesPage,
});

function ProfileTradesPage() {
  return <div>Profile Trades</div>;
}
