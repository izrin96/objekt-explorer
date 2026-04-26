import { createFileRoute } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";
import * as z from "zod";

import ResetPassword from "@/components/auth/reset-password";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/(container)/auth/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  head: () => ({
    meta: [{ title: "Reset Password · Objekt Tracker" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const content = useIntlayer("auth");
  const { token } = Route.useSearch();

  if (!token) {
    return <div>{content.reset_password.invalid_token.value}</div>;
  }

  return <ResetPassword token={token as string} />;
}
