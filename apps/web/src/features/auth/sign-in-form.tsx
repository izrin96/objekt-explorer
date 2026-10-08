import { parseBanNotice } from "@repo/api/schemas/moderation";
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
import { PasswordInput } from "@/features/auth/password-input";
import { useAuthSuccess } from "@/features/auth/redirect";
import { SocialSignIn } from "@/features/auth/social-sign-in";
import { authClient } from "@/lib/auth-client";
import { type FieldErrors, zodErrors } from "@/lib/form";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

// built per submit, not at module scope: the message functions read the
// request's locale, which on the server is only bound while a request runs
function schema() {
  return z.object({
    email: z.string().min(1, m.common_validation_required_email()),
    password: z.string().min(1, m.common_validation_required_password()),
  });
}

export const BANNED = "BANNED_USER";

/**
 * Better Auth checks a ban only after the password or the provider's consent, so this message
 * reaches only someone who already proved the account is theirs.
 */
export function banText(message: string | undefined) {
  const notice = parseBanNotice(message);
  if (!notice) return m.auth_banned();
  if (!notice.until) return m.auth_banned_forever({ reason: notice.reason });
  const end = new Date(notice.until);
  // Intl throws on an invalid date; the generic notice still says why sign-in failed
  if (Number.isNaN(end.getTime())) return m.auth_banned();
  const until = new Intl.DateTimeFormat(getLocale(), { dateStyle: "long" }).format(end);
  return m.auth_banned_until({ until, reason: notice.reason });
}

/** Marks an error whose message is already the whole sentence to show. */
function bannedError(message: string | undefined) {
  return Object.assign(new Error(banText(message)), { name: BANNED });
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
          <p role="alert" className="text-destructive-foreground text-xs text-pretty">
            {mutation.error.name === BANNED
              ? mutation.error.message
              : m.auth_sign_in_error({ message: mutation.error.message })}
          </p>
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
