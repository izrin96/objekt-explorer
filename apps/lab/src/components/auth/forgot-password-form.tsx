import { useState } from "react";
import * as z from "zod";

import { AUTH_COPY } from "@/components/auth/copy";
import { type FieldErrors, useFakeSubmit, zodErrors } from "@/components/auth/form-util";
import type { AuthState } from "@/components/auth/sign-in";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";

const schema = z.object({
  email: z.string().min(1, AUTH_COPY.requiredEmail),
});

/**
 * Port of `apps/website/src/components/auth/forgot-password-form.tsx`. The
 * website has no `/auth/forgot` route — forgot-password is a third state of
 * the login page — so the lab keeps it as a state too, and a successful send
 * drops back to Sign In exactly as the website's `onSuccess` does.
 */
export function ForgotPasswordForm({ setState }: { setState: (state: AuthState) => void }) {
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
          toastManager.add({ type: "success", title: AUTH_COPY.forgotPassword.success });
          setState("sign-in");
        });
      }}
    >
      <Field name="email" className="gap-1.5">
        <FieldLabel>{AUTH_COPY.forgotPassword.emailLabel}</FieldLabel>
        <Input
          type="email"
          autoComplete="email"
          aria-required
          placeholder={AUTH_COPY.forgotPassword.emailPlaceholder}
        />
        <FieldError />
      </Field>

      <Button type="submit" loading={pending}>
        {AUTH_COPY.forgotPassword.submit}
      </Button>
      <Button variant="outline" onClick={() => setState("sign-in")}>
        {AUTH_COPY.forgotPassword.back}
      </Button>
    </Form>
  );
}
