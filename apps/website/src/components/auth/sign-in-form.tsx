import {
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useTransition } from "react";
import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { FieldError, Label } from "../intentui/field";
import { Input } from "../intentui/input";
import { TextField } from "../intentui/text-field";

export function SignInForm({
  setState,
}: {
  setState: (state: "sign-in" | "sign-up" | "forgot-password") => void;
}) {
  const router = useRouter();
  const { handleSubmit, control } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authClient.signIn.email({
        email: email,
        password: password,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: async (_, _v, _o, { client }) => {
      toast.success(m.auth_sign_in_success());
      void client.invalidateQueries({
        queryKey: orpc.user.currentUser.key(),
      });
      void router.navigate({ to: "/" });
    },
    onError: (err) => {
      toast.error(m.auth_sign_in_error({ message: err.message }));
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({ email: data.email, password: data.password });
  });

  return (
    <>
      <div className="flex flex-col">
        <h2 className="font-display text-xl font-semibold">{m.auth_sign_in_title()}</h2>
        <span className="text-muted-fg text-sm">{m.auth_sign_in_description()}</span>
      </div>
      <Form onSubmit={onSubmit} className="flex flex-col gap-4" validationBehavior="aria">
        <Controller
          control={control}
          name="email"
          rules={{
            required: m.common_validation_required_email(),
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              type="email"
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isRequired
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{m.auth_sign_in_email_label()}</Label>
              <Input placeholder={m.auth_sign_in_email_placeholder()} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: m.common_validation_required_password(),
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              type="password"
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isRequired
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{m.auth_sign_in_password_label()}</Label>
              <Input placeholder={m.auth_sign_in_password_placeholder()} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" intent="primary" isPending={mutation.isPending}>
          {m.auth_sign_in_submit()}
        </Button>
      </Form>

      <div className="flex flex-col gap-2">
        <Button intent="outline" className="gap-2" onPress={() => setState("forgot-password")}>
          <EnvelopeSimpleIcon size={18} weight="light" />
          {m.auth_sign_in_forgot_password()}
        </Button>
        <Button intent="outline" className="gap-2" onPress={() => setState("sign-up")}>
          <UserPlusIcon size={18} weight="light" />
          {m.auth_sign_in_create_account()}
        </Button>
      </div>

      <div className="relative my-2 flex items-center justify-center text-sm">
        <div className="absolute inset-0 flex items-center">
          <div className="bg-border h-px w-full shrink-0"></div>
        </div>
        <span className="bg-bg relative px-3">{m.auth_sign_in_or_continue()}</span>
      </div>

      <div className="flex flex-col gap-2">
        <SignInWithDiscord />
        <SignInWithTwitter />
      </div>
    </>
  );
}

function SignInWithDiscord() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      intent="outline"
      className="gap-2"
      isPending={isPending}
      onPress={() => {
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "discord",
          });
        });
      }}
    >
      <DiscordLogoIcon size={18} weight="light" />
      {m.auth_sign_in_sign_in_discord()}
    </Button>
  );
}

function SignInWithTwitter() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      intent="outline"
      className="gap-2"
      isPending={isPending}
      onPress={() => {
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "twitter",
          });
        });
      }}
    >
      <XLogoIcon size={18} weight="light" />
      {m.auth_sign_in_sign_in_twitter()}
    </Button>
  );
}
