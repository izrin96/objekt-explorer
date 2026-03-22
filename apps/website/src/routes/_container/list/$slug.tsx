import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/list/$slug")({
  head: () => ({
    meta: [{ title: "List · Objekt Tracker" }],
  }),
  component: ListDetailPage,
});

function ListDetailPage() {
  const { slug } = Route.useParams();
  return (
    <div className="flex flex-col gap-4 pt-2 pb-36">
      <div>List: {slug}</div>
    </div>
  );
}
