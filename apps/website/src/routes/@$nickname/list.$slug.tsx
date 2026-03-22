import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@$nickname/list/$slug")({
  head: () => ({
    meta: [{ title: "List · Objekt Tracker" }],
  }),
  component: ProfileListDetailPage,
});

function ProfileListDetailPage() {
  const { nickname, slug } = Route.useParams();
  return (
    <div className="flex flex-col gap-4 pt-2 pb-36">
      <div>
        List: {nickname} / {slug}
      </div>
    </div>
  );
}
