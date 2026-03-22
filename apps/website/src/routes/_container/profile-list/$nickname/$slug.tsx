import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const profileListSearchSchema = z.object({});

export const Route = createFileRoute("/_container/profile-list/$nickname/$slug")({
  validateSearch: profileListSearchSchema,
  head: () => ({
    meta: [{ title: "List · Objekt Tracker" }],
  }),
  component: ProfileListPage,
});

function ProfileListPage() {
  const { nickname, slug } = Route.useParams();
  return (
    <div className="flex flex-col gap-4 pt-2 pb-36">
      <div>
        Profile List: {nickname} / {slug}
      </div>
    </div>
  );
}
