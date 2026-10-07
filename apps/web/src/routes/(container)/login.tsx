import { createFileRoute, redirect as routerRedirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as z from "zod";

import { SignIn } from "@/features/auth/sign-in";
import { BANNED, banText } from "@/features/auth/sign-in-form";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/login")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(undefined),
    // set by Better Auth when an OAuth sign-in is refused at its callback
    error: z.string().optional().catch(undefined),
    error_description: z.string().optional().catch(undefined),
  }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (user) throw routerRedirect({ to: "/" });
  },
  head: () => generateMetadata({ title: m.page_titles_login() }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, error, error_description: description } = Route.useSearch();
  const navigate = Route.useNavigate();
  // read once, then dropped from the URL, so a reload or a copied link does not repeat it
  const [notice] = useState(() =>
    error === BANNED
      ? banText(description)
      : error
        ? m.auth_sign_in_error({ message: description ?? error })
        : null,
  );

  useEffect(() => {
    if (error !== undefined) void navigate({ search: { redirect }, replace: true });
  }, [error, redirect, navigate]);

  return <SignIn redirect={redirect} notice={notice} />;
}
