import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";

import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/auth/verified")({
  component: VerifiedPage,
});

function VerifiedPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 pt-4 pb-36">
      <SealCheckIcon size={64} weight="light" />
      <span>{m.auth_verified_email_verified()}</span>
    </div>
  );
}
