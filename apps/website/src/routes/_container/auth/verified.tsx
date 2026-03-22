import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/auth/verified")({
  head: () => ({
    meta: [{ title: "Email Verified · Objekt Tracker" }],
  }),
  component: VerifiedPage,
});

function VerifiedPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <SealCheckIcon size={64} weight="light" />
      <p>Email verified</p>
    </div>
  );
}
