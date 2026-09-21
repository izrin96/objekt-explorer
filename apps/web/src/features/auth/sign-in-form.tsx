import {
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { PasswordInput } from "@/features/auth/password-input";
import { useAuthSuccess } from "@/features/auth/redirect";
import type { AuthState } from "@/features/auth/sign-in";
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
  setState,
  redirect,
}: {
  setState: (state: AuthState) => void;
  redirect?: string;
}) {
  const onSuccess = useAuthSuccess(redirect);
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authClient.signIn.email({ email, password });
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
      <div className="flex flex-col">
        <h1 className="font-display text-xl font-semibold">{m.auth_sign_in_title()}</h1>
        <span className="text-muted-foreground text-sm">{m.auth_sign_in_description()}</span>
      </div>

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
          <PasswordInput
            autoComplete="current-password"
            aria-required
            placeholder={m.auth_sign_in_password_placeholder()}
          />
          <FieldError />
        </Field>

        <Button type="submit" loading={mutation.isPending}>
          {m.auth_sign_in_submit()}
        </Button>

        {mutation.isError && (
          <p role="alert" className="text-destructive-foreground text-xs text-pretty">
            {m.auth_sign_in_error({ message: mutation.error.message })}
          </p>
        )}
      </Form>

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => setState("forgot-password")}>
          <EnvelopeSimpleIcon size={18} weight="light" />
          {m.auth_sign_in_forgot_password()}
        </Button>
        <Button variant="outline" onClick={() => setState("sign-up")}>
          <UserPlusIcon size={18} weight="light" />
          {m.auth_sign_in_create_account()}
        </Button>
      </div>

      {/* the divider's label masks the rule with the surface behind it, which
          inside this card is `bg-popover`, not `bg-background` */}
      <div className="relative flex items-center justify-center text-sm">
        <div className="absolute inset-0 flex items-center">
          <div className="bg-border h-px w-full shrink-0" />
        </div>
        <span className="bg-popover text-muted-foreground relative px-3">
          {m.auth_sign_in_or_continue()}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <SocialButton provider="discord" label={m.auth_sign_in_sign_in_discord()}>
          <DiscordLogoIcon size={18} weight="light" />
        </SocialButton>
        <SocialButton provider="twitter" label={m.auth_sign_in_sign_in_twitter()}>
          <XLogoIcon size={18} weight="light" />
        </SocialButton>
      </div>
    </>
  );
}

function SocialButton({
  provider,
  label,
  children,
}: {
  provider: "discord" | "twitter";
  label: string;
  children: React.ReactNode;
}) {
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({ provider });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onError: ({ message }) => {
      toastManager.add({ type: "error", title: m.auth_sign_in_error({ message }) });
    },
  });

  return (
    <Button variant="outline" loading={mutation.isPending} onClick={() => mutation.mutate()}>
      {children}
      {label}
    </Button>
  );
}
