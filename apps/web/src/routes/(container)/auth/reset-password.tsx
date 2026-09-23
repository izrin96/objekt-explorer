import { createFileRoute, notFound } from "@tanstack/react-router";
import * as z from "zod";

import { NotFoundComponent } from "@/components/router/not-found";
import { ResetPassword } from "@/features/auth/reset-password";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/auth/reset-password")({
  // `.catch` rather than a required token: a missing or empty one is the
  // not-found surface, not a search-param error page
  validateSearch: z.object({ token: z.string().min(1).optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    if (search.token === undefined) throw notFound();
    return { token: search.token };
  },
  head: () => generateMetadata({ title: m.auth_reset_password_title() }),
  notFoundComponent: NotFoundComponent,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useRouteContext();

  return <ResetPassword token={token} />;
}
