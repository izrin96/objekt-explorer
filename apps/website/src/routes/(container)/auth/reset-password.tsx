import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import ResetPassword from "@/components/auth/reset-password";

const resetPasswordSearchSchema = z.object({
  token: z.string().min(1),
});

export const Route = createFileRoute("/(container)/auth/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();

  return (
    <div className="pt-4 pb-36">
      <ResetPassword token={token} />
    </div>
  );
}
