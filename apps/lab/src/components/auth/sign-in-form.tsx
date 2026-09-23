import {
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";
import type React from "react";
import { useState } from "react";
import * as z from "zod";

import { AUTH_COPY, NOT_WIRED } from "@/components/auth/copy";
import { type FieldErrors, useFakeSubmit, zodErrors } from "@/components/auth/form-util";
import { PasswordInput } from "@/components/auth/password-input";
import type { AuthState } from "@/components/auth/sign-in";
import { notImplemented } from "@/components/shared/not-implemented";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import { useSession } from "@/store/session";

const schema = z.object({
  email: z.string().min(1, AUTH_COPY.requiredEmail),
  password: z.string().min(1, AUTH_COPY.requiredPassword),
});

/**
 * Port of `apps/website/src/components/auth/sign-in-form.tsx`. The Better Auth
 * call is replaced by the lab's fake session: a submit that clears validation
 * flips `signedIn` on and lands on `redirect` (or `/`).
 */
export function SignInForm({
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
    <>
      <div className="flex flex-col">
        <h1 className="font-display text-xl font-semibold">{AUTH_COPY.signIn.title}</h1>
        <span className="text-muted-foreground text-sm">{AUTH_COPY.signIn.description}</span>
      </div>

      <Form
        errors={errors}
        onFormSubmit={(values) => {
          const next = zodErrors(schema, values);
          setErrors(next);
          if (Object.keys(next).length > 0) return;
          run(() => {
            signIn();
            toastManager.add({ type: "success", title: AUTH_COPY.signIn.success });
            // `redirect` is a built href, not one of the registered paths, so it
            // cannot go through `navigate({ to })` — this is TanStack's own
            // authenticated-route pattern
            if (redirect !== undefined) router.history.push(redirect);
            else void router.navigate({ to: "/" });
          });
        }}
      >
        <Field name="email" className="gap-1.5">
          <FieldLabel>{AUTH_COPY.signIn.emailLabel}</FieldLabel>
          <Input
            type="email"
            autoComplete="email"
            aria-required
            placeholder={AUTH_COPY.signIn.emailPlaceholder}
          />
          <FieldError />
        </Field>

        <Field name="password" className="gap-1.5">
          <FieldLabel>{AUTH_COPY.signIn.passwordLabel}</FieldLabel>
          <PasswordInput
            autoComplete="current-password"
            aria-required
            placeholder={AUTH_COPY.signIn.passwordPlaceholder}
          />
          <FieldError />
        </Field>

        <Button type="submit" loading={pending}>
          {AUTH_COPY.signIn.submit}
        </Button>
      </Form>

      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => setState("forgot-password")}>
          <EnvelopeSimpleIcon size={18} weight="light" />
          {AUTH_COPY.signIn.forgotPassword}
        </Button>
        <Button variant="outline" onClick={() => setState("sign-up")}>
          <UserPlusIcon size={18} weight="light" />
          {AUTH_COPY.signIn.createAccount}
        </Button>
      </div>

      {/* the website's rule, kept: the divider's label masks the rule with the
          surface behind it, which inside this card is `bg-popover`, not `bg-background` */}
      <div className="relative flex items-center justify-center text-sm">
        <div className="absolute inset-0 flex items-center">
          <div className="bg-border h-px w-full shrink-0" />
        </div>
        <span className="bg-popover text-muted-foreground relative px-3">
          {AUTH_COPY.signIn.orContinue}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <SocialButton label={AUTH_COPY.signIn.discord}>
          <DiscordLogoIcon size={18} weight="light" />
        </SocialButton>
        <SocialButton label={AUTH_COPY.signIn.twitter}>
          <XLogoIcon size={18} weight="light" />
        </SocialButton>
      </div>
    </>
  );
}

/** no provider is wired in the lab, so both buttons answer the same way */
function SocialButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      onClick={() => notImplemented({ type: "info", title: label, description: NOT_WIRED })}
    >
      {children}
      {label}
    </Button>
  );
}
