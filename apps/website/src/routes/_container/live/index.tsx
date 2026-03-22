import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const liveSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/_container/live/")({
  validateSearch: liveSearchSchema,
  head: () => ({
    meta: [{ title: "Live · Objekt Tracker" }],
  }),
  component: LivePage,
});

function LivePage() {
  const { token } = Route.useSearch();
  return (
    <div className="flex flex-col gap-3 pt-2 pb-36">
      <div>Live Sessions</div>
      {token && <div>Token: {token}</div>}
    </div>
  );
}
