import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { AuthShell } from "@/components/auth/auth-shell";
import { AUTH_COPY } from "@/components/auth/copy";
import { type FieldErrors, useFakeSubmit, zodErrors } from "@/components/auth/form-util";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { toastManager } from "@/components/ui/toast";

const schema = z.object({
  password: z.string().min(1, AUTH_COPY.resetPassword.passwordRequired),
});

/**
 * Port of `apps/website/src/components/auth/reset-password.tsx`. The website's
 * route makes `token` a required search param and 400s without it; the lab
 * renders the form either way and only echoes whether a token came along, so
 * the surface can be opened straight from the address bar.
 */
export function ResetPassword({ token }: { token?: string }) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<FieldErrors>({});
  const { pending, run } = useFakeSubmit();

  return (
    <AuthShell>
      <div className="flex flex-col">
        <h1 className="font-display text-xl font-semibold">{AUTH_COPY.resetPassword.title}</h1>
        <span className="text-muted-foreground font-mono text-xs">
          {token !== undefined && token !== "" ? `token ${token}` : "no token in the URL"}
        </span>
      </div>

      <Form
        errors={errors}
        onFormSubmit={(values) => {
          const next = zodErrors(schema, values);
          setErrors(next);
          if (Object.keys(next).length > 0) return;
          run(() => {
            toastManager.add({ type: "success", title: AUTH_COPY.resetPassword.success });
            void navigate({ to: "/login" });
          });
        }}
      >
        <Field name="password" className="gap-1.5">
          <FieldLabel>{AUTH_COPY.resetPassword.passwordLabel}</FieldLabel>
          <PasswordInput
            autoComplete="new-password"
            aria-required
            placeholder={AUTH_COPY.resetPassword.passwordPlaceholder}
          />
          <FieldError />
        </Field>

        <Button type="submit" loading={pending}>
          {AUTH_COPY.resetPassword.submit}
        </Button>
      </Form>
    </AuthShell>
  );
}
