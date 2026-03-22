import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/_container/auth/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  head: () => ({
    meta: [{ title: "Reset Password · Objekt Tracker" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();

  if (!token) {
    return <div>Invalid token</div>;
  }

  return <div>Reset Password</div>;
}
