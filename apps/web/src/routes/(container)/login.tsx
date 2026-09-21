import { createFileRoute, redirect as routerRedirect } from "@tanstack/react-router";
import * as z from "zod";

import { SignIn } from "@/features/auth/sign-in";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context: { queryClient } }) => {
    const user = await queryClient.ensureQueryData(currentUserOptions);
    if (user) throw routerRedirect({ to: "/" });
  },
  head: () => generateMetadata({ title: m.page_titles_login() }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();

  return <SignIn redirect={redirect} />;
}
