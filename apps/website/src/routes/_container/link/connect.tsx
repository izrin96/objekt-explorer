import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/link/connect")({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/" });
    }
  },
  component: LinkConnectPage,
});

function LinkConnectPage() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <div>Connect Cosmo</div>
    </div>
  );
}
