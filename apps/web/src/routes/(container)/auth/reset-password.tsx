import { createFileRoute, notFound } from "@tanstack/react-router";
import * as z from "zod";

import { NotFoundComponent } from "@/components/router/not-found";
import { ResetPassword, ResetPasswordExpired } from "@/features/auth/reset-password";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/auth/reset-password")({
  // `.catch` rather than required: a malformed param is the not-found or
  // expired surface, not a search-param error page
  validateSearch: z.object({
    token: z.string().min(1).optional().catch(undefined),
    // Better Auth sends `INVALID_TOKEN` here for a used or expired link
    error: z.string().optional().catch(undefined),
  }),
  beforeLoad: ({ search }) => {
    if (search.token === undefined && search.error === undefined) throw notFound();
    return { token: search.error === undefined ? search.token : undefined };
  },
  head: ({ match: { search } }) =>
    generateMetadata({
      title:
        search.error === undefined
          ? m.auth_reset_password_title()
          : m.auth_reset_password_expired_title(),
    }),
  notFoundComponent: NotFoundComponent,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useRouteContext();

  return token === undefined ? <ResetPasswordExpired /> : <ResetPassword token={token} />;
}
