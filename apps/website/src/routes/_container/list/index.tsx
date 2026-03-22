import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/list/")({
  head: () => ({
    meta: [{ title: "My List · Objekt Tracker" }],
  }),
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/" });
    }
  },
  component: ListPage,
});

function ListPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <div>My Lists</div>
    </div>
  );
}
