import { SealCheckIcon } from "@phosphor-icons/react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/auth-shell";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/auth/verified")({
  head: () => generateMetadata({ title: m.auth_verified_email_verified() }),
  component: VerifiedPage,
});

function VerifiedPage() {
  return (
    <AuthShell className="items-center gap-4 py-8 text-center">
      <SealCheckIcon size={64} weight="light" />
      <span>{m.auth_verified_email_verified()}</span>
      <Button variant="outline" render={<Link to="/" />} className="w-full">
        {m.auth_account_continue()}
      </Button>
    </AuthShell>
  );
}
