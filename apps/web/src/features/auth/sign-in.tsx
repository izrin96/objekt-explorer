import { useState } from "react";

import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { SignInForm } from "@/features/auth/sign-in-form";
import { SignUpForm } from "@/features/auth/sign-up-form";

export type AuthState = "sign-in" | "sign-up" | "forgot-password";

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
