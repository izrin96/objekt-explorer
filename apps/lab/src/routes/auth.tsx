import { SealCheckIcon } from "@phosphor-icons/react";
import { createRoute, Link } from "@tanstack/react-router";
import * as z from "zod";

import { AuthShell } from "@/components/auth/auth-shell";
import { AUTH_COPY } from "@/components/auth/copy";
import { ResetPassword } from "@/components/auth/reset-password";
import { Button } from "@/components/ui/button";
import { rootRoute } from "@/routes/root";

/**
 * The website's schema is `z.object({ token: z.string().min(1) })`, which
 * makes the route unreachable without a token. The lab keeps the param
 * optional so the surface can be opened directly, and the form shows either
 * way — there is nothing behind it to reject a bad one.
 */
const resetPasswordSearchSchema = z.object({
  token: z.string().optional(),
});

function ResetPasswordPage() {
  const { token } = resetPasswordRoute.useSearch();

  return <ResetPassword token={token} />;
}

export const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/reset-password",
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

/** Port of `(container)/auth/verified.tsx`, plus the Continue link it lacks. */
function VerifiedPage() {
  return (
    <AuthShell className="items-center gap-4 py-8 text-center">
      <SealCheckIcon size={64} weight="light" />
      <span>{AUTH_COPY.verified.emailVerified}</span>
      <Button variant="outline" render={<Link to="/" />} className="w-full">
        {AUTH_COPY.verified.continue}
      </Button>
    </AuthShell>
  );
}

export const verifiedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/verified",
  component: VerifiedPage,
});
