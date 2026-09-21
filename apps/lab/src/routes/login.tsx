import { createRoute, redirect } from "@tanstack/react-router";
import * as z from "zod";

import { SignIn } from "@/components/auth/sign-in";
import { rootRoute } from "@/routes/root";
import { useSession } from "@/store/session";

/**
 * `?redirect=` is where the nav's Sign in button parks the page you were on,
 * so a successful sign in lands back there instead of on Home. It is a whole
 * href rather than a typed route, which is why the forms navigate with
 * `{ href }` — `to` only takes the registered paths.
 */
const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

function LoginPage() {
  const { redirect: target } = loginRoute.useSearch();

  return <SignIn redirect={target} />;
}

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: loginSearchSchema,
  // zustand's `persist` rehydrates from localStorage synchronously at module
  // load, so the store already knows the answer before the first navigation
  beforeLoad: () => {
    if (useSession.getState().signedIn) throw redirect({ to: "/" });
  },
  component: LoginPage,
});
