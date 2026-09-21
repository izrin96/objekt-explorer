import { useState } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";

export type AuthState = "sign-in" | "sign-up" | "forgot-password";

/**
 * Port of `apps/website/src/components/auth/sign-in.tsx`: one page holding
 * three states, not three routes. The website has no tab strip here — the
 * buttons under the sign-in form are the only way between them — so the lab
 * keeps that shape rather than inventing a Tabs root the app would not have.
 */
export function SignIn({ redirect }: { redirect?: string }) {
  const [state, setState] = useState<AuthState>("sign-in");

  return (
    <AuthShell>
      {state === "sign-in" && <SignInForm setState={setState} redirect={redirect} />}
      {state === "sign-up" && <SignUpForm setState={setState} redirect={redirect} />}
      {state === "forgot-password" && <ForgotPasswordForm setState={setState} />}
    </AuthShell>
  );
}
