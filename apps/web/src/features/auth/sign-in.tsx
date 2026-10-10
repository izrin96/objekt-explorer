import { AuthShell, TermsNote } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { SignInForm } from "@/features/auth/sign-in-form";
import { SignUpForm } from "@/features/auth/sign-up-form";

/** `/login`'s `mode`; absent is sign-in */
export type AuthMode = "sign-up" | "forgot-password";

export function SignIn({
  mode,
  redirect,
  notice,
}: {
  mode?: AuthMode;
  redirect?: string;
  notice?: string | null;
}) {
  return (
    <AuthShell footer={mode === "forgot-password" ? undefined : <TermsNote />}>
      {mode === undefined && <SignInForm redirect={redirect} notice={notice} />}
      {mode === "sign-up" && <SignUpForm redirect={redirect} />}
      {mode === "forgot-password" && <ForgotPasswordForm redirect={redirect} />}
    </AuthShell>
  );
}
