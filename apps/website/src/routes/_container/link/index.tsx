import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/link/")({
  head: () => ({
    meta: [{ title: "My Cosmo Link · Objekt Tracker" }],
  }),
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/" });
    }
  },
  component: LinkPage,
});

function LinkPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">My Cosmo</div>
        <div>Link</div>
      </div>
    </div>
  );
}
