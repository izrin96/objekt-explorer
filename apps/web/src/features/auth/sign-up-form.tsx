import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import * as z from "zod";

import { MessageMarkup } from "@/components/shared/message-markup";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { AuthDivider, AuthHeader, authLinkClass } from "@/features/auth/auth-shell";
import { PasswordInput } from "@/features/auth/password-input";
import { useAuthSuccess } from "@/features/auth/redirect";
import { SocialSignIn } from "@/features/auth/social-sign-in";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";

// Better Auth's default `minPasswordLength`
export const MIN_PASSWORD = 8;

function schema() {
  return z.object({
    name: z.string().min(1, m.common_validation_required_name()),
    email: z.string().min(1, m.common_validation_required_email()),
    password: z
      .string()
      .min(1, { message: m.common_validation_required_password(), abort: true })
      .min(MIN_PASSWORD, m.common_validation_password_length()),
  });
}

export function SignUpForm({ redirect }: { redirect?: string }) {
  const onSuccess = useAuthSuccess(redirect);
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      // the verification email's link lands here once the address is confirmed
      const result = await authClient.signUp.email({ ...data, callbackURL: "/auth/verified" });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async () => {
      toastManager.add({ type: "success", title: m.auth_sign_up_success() });
      await onSuccess();
    },
  });

  return (
    <>
      <AuthHeader title={m.auth_sign_up_title()} description={m.auth_sign_up_description()} />

      <SocialSignIn redirect={redirect} />

      <AuthDivider label={m.auth_sign_in_or_continue()} />

      <Form
        errors={errors}
        onFormSubmit={(values) => {
          const next = zodErrors(schema(), values);
          setErrors(next);
          if (Object.keys(next).length > 0) return;
          mutation.mutate({
            name: String(values.name),
            email: String(values.email),
            password: String(values.password),
          });
        }}
      >
        <Field name="name" className="gap-1.5">
          <FieldLabel>{m.auth_sign_up_name_label()}</FieldLabel>
          <Input
            type="text"
            autoComplete="name"
            aria-required
            placeholder={m.auth_sign_up_name_placeholder()}
          />
          <FieldError />
        </Field>

        <Field name="email" className="gap-1.5">
          <FieldLabel>{m.auth_sign_up_email_label()}</FieldLabel>
          <Input
            type="email"
            autoComplete="email"
            aria-required
            placeholder={m.auth_sign_up_email_placeholder()}
          />
          <FieldError />
        </Field>

        <Field name="password" className="gap-1.5">
          <FieldLabel>{m.auth_sign_up_password_label()}</FieldLabel>
          <PasswordInput autoComplete="new-password" aria-required />
          <FieldDescription>{m.auth_sign_up_password_description()}</FieldDescription>
          <FieldError />
        </Field>

        <Button type="submit" loading={mutation.isPending}>
          {m.auth_sign_up_submit()}
        </Button>

        {mutation.isError && (
          <p role="alert" className="text-destructive-foreground text-xs text-pretty">
            {m.auth_sign_up_error({ message: mutation.error.message })}
          </p>
        )}
      </Form>

      <p className="text-muted-foreground text-center text-sm">
        <MessageMarkup
          parts={m.auth_sign_up_have_account.parts()}
          markup={{
            link: (children) => (
              <Link to="/login" search={{ redirect }} className={authLinkClass}>
                {children}
              </Link>
            ),
          }}
        />
      </p>
    </>
  );
}
