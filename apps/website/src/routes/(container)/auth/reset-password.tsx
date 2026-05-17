import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import ResetPassword from "@/components/auth/reset-password";
import { m } from "@/paraglide/messages";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/(container)/auth/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();

  if (!token) {
    return <div>{m.auth_reset_password_invalid_token()}</div>;
  }

  return <ResetPassword token={token as string} />;
}
