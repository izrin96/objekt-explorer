import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { MessageMarkup } from "@/components/shared/message-markup";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { AuthDivider, AuthHeader, authLinkClass } from "@/features/auth/auth-shell";
import { BANNED, bannedError } from "@/features/auth/ban-notice";
import { FormError } from "@/features/auth/form-error";
import { PasswordInput } from "@/features/auth/password-input";
import { useAuthSuccess } from "@/features/auth/redirect";
import { SocialSignIn } from "@/features/auth/social-sign-in";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

// built per submit, not at module scope: the message functions read the
// request's locale, which on the server is only bound while a request runs
function schema() {
  return z.object({
    email: z.string().min(1, m.common_validation_required_email()),
    password: z.string().min(1, m.common_validation_required_password()),
  });
}

export function SignInForm({
  redirect,
  notice,
}: {
  redirect?: string;
  /** a refusal the OAuth callback sent back, already worded */
  notice?: string | null;
}) {
  const onSuccess = useAuthSuccess(redirect);
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authClient.signIn.email({ email, password });
      if (result.error?.code === BANNED) throw bannedError(result.error.message);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      toastManager.add({ type: "success", title: m.auth_sign_in_success() });
      await onSuccess();
    },
  });

  return (
    <>
      <AuthHeader title={m.auth_sign_in_title()} description={m.auth_sign_in_description()} />

      {notice ? (
        <p
          role="alert"
          className="border-destructive/32 text-destructive-foreground rounded-lg border px-3 py-2 text-sm text-pretty"
        >
          {notice}
        </p>
      ) : null}

      <SocialSignIn redirect={redirect} />

      <AuthDivider label={m.auth_sign_in_or_continue()} />

      <Form
        errors={errors}
        onFormSubmit={(values) => {
          const next = zodErrors(schema(), values);
          setErrors(next);
          if (Object.keys(next).length > 0) return;
          mutation.mutate({ email: String(values.email), password: String(values.password) });
        }}
      >
        <Field name="email" className="gap-1.5">
          <FieldLabel>{m.auth_sign_in_email_label()}</FieldLabel>
          <Input
            type="email"
            autoComplete="email"
            aria-required
            placeholder={m.auth_sign_in_email_placeholder()}
          />
          <FieldError />
        </Field>

        <Field name="password" className="gap-1.5">
          <FieldLabel>{m.auth_sign_in_password_label()}</FieldLabel>
          <PasswordInput autoComplete="current-password" aria-required />
          <FieldError />
        </Field>

        <Button type="submit" loading={mutation.isPending}>
          {m.auth_sign_in_submit()}
        </Button>

        {mutation.isError && (
          <FormError>
            {mutation.error.name === BANNED
              ? mutation.error.message
              : m.auth_sign_in_error({ message: mutation.error.message })}
          </FormError>
        )}
      </Form>

      <div className="text-muted-foreground flex flex-col items-center gap-1.5 text-sm">
        <Link
          to="/login"
          search={{ redirect, mode: "forgot-password" }}
          className="hover:text-foreground underline-offset-4 hover:underline"
        >
          {m.auth_sign_in_forgot_password()}
        </Link>
        <p>
          <MessageMarkup
            parts={m.auth_sign_in_new_here.parts()}
            markup={{
              link: (children) => (
                <Link to="/login" search={{ redirect, mode: "sign-up" }} className={authLinkClass}>
                  {children}
                </Link>
              ),
            }}
          />
        </p>
      </div>
    </>
  );
}
