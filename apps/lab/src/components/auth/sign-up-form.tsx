import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { AUTH_COPY } from "@/components/auth/copy";
import { type FieldErrors, useFakeSubmit, zodErrors } from "@/components/auth/form-util";
import { PasswordInput } from "@/components/auth/password-input";
import type { AuthState } from "@/components/auth/sign-in";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { TERMS_COPY } from "@/routes/terms-privacy";
import { useSession } from "@/store/session";

const schema = z.object({
  name: z.string().min(1, AUTH_COPY.requiredName),
  email: z.string().min(1, AUTH_COPY.requiredEmail),
  password: z.string().min(1, AUTH_COPY.requiredPassword),
});

/**
 * Port of `apps/website/src/components/auth/sign-up-form.tsx`. Same three
 * fields, same order, and the same two buttons under them — the website's
 * sign-up state carries no heading of its own, so neither does this one.
 */
export function SignUpForm({
  setState,
  redirect,
}: {
  setState: (state: AuthState) => void;
  redirect?: string;
}) {
  const router = useRouter();
  const signIn = useSession((s) => s.signIn);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { pending, run } = useFakeSubmit();

  return (
    <Form
      errors={errors}
      onFormSubmit={(values) => {
        const next = zodErrors(schema, values);
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        run(() => {
          signIn();
          toastManager.add({ type: "success", title: AUTH_COPY.signUp.success });
          // `redirect` is a built href, not one of the registered paths, so it
          // cannot go through `navigate({ to })` — this is TanStack's own
          // authenticated-route pattern
          if (redirect !== undefined) router.history.push(redirect);
          else void router.navigate({ to: "/" });
        });
      }}
    >
      <Field name="name" className="gap-1.5">
        <FieldLabel>{AUTH_COPY.signUp.nameLabel}</FieldLabel>
        <Input
          type="text"
          autoComplete="name"
          aria-required
          placeholder={AUTH_COPY.signUp.namePlaceholder}
        />
        <FieldError />
      </Field>

      <Field name="email" className="gap-1.5">
        <FieldLabel>{AUTH_COPY.signUp.emailLabel}</FieldLabel>
        <Input
          type="email"
          autoComplete="email"
          aria-required
          placeholder={AUTH_COPY.signUp.emailPlaceholder}
        />
        <FieldError />
      </Field>

      {/* the website's sign-up password field carries no placeholder */}
      <Field name="password" className="gap-1.5">
        <FieldLabel>{AUTH_COPY.signUp.passwordLabel}</FieldLabel>
        <PasswordInput autoComplete="new-password" aria-required />
        <FieldError />
      </Field>

      <Button type="submit" loading={pending}>
        {AUTH_COPY.signUp.submit}
      </Button>
      <Button variant="outline" onClick={() => setState("sign-in")}>
        {AUTH_COPY.signUp.back}
      </Button>
      {/* `apps/website` ships `/terms-privacy` but links it from nowhere — no
          footer, and the sign-up form ends at its two buttons. The page is the
          one place an account is created, so the lab points at it from here;
          the wording is the lab's, since the website has no string for a link
          it does not render. */}
      <p className="text-muted-foreground text-center text-xs">
        By creating an account you agree to our{" "}
        <Link to="/terms-privacy" className="underline underline-offset-2">
          {TERMS_COPY.heading}
        </Link>
        .
      </p>
    </Form>
  );
}
