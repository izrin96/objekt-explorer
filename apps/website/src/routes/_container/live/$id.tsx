import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const liveDetailSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/_container/live/$id")({
  validateSearch: liveDetailSearchSchema,
  head: () => ({
    meta: [{ title: "Live · Objekt Tracker" }],
  }),
  component: LiveDetailPage,
});

function LiveDetailPage() {
  const { id } = Route.useParams();
  const { token } = Route.useSearch();

  if (!token) {
    throw redirect({ to: "/live" });
  }

  return (
    <div className="flex flex-col pt-2">
      <div>Live Session: {id}</div>
    </div>
  );
}
