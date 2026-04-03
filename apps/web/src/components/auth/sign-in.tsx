"use client";

import {
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Form } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "../ui/button";
import { FieldError, Label } from "../ui/field";
import { Input } from "../ui/input";
import { TextField } from "../ui/text-field";

export default function SignIn() {
  const [state, setState] = useState<"sign-in" | "sign-up" | "forgot-password">("sign-in");

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex w-full max-w-md flex-col gap-6 self-center">
        {state === "sign-in" && <SignInForm setState={setState} />}
        {state === "sign-up" && <SignUpForm setState={setState} />}
        {state === "forgot-password" && <ForgotPassword setState={setState} />}
      </div>
    </div>
  );
}

function SignInForm({
  setState,
}: {
  setState: (state: "sign-in" | "sign-up" | "forgot-password") => void;
}) {
  const router = useRouter();
  const content = useIntlayer("auth");
  const commonContent = useIntlayer("common");

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
      toast.success(content.sign_in.success.value);
      void client.invalidateQueries({
        queryKey: ["session"],
      });
      router.push("/");
    },
    onError: (err) => {
      toast.error(content.sign_in.error({ message: err.message }).value);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({ email: data.email, password: data.password });
  });

  return (
    <>
      <div className="flex flex-col">
        <h2 className="text-lg/8 font-semibold">{content.sign_in.title.value}</h2>
        <span className="text-muted-fg text-sm">{content.sign_in.description.value}</span>
      </div>
      <Form onSubmit={onSubmit} className="flex flex-col gap-4" validationBehavior="aria">
        <Controller
          control={control}
          name="email"
          rules={{
            required: commonContent.validation.required_email.value,
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
              <Label>{content.sign_in.email_label.value}</Label>
              <Input placeholder={content.sign_in.email_placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: commonContent.validation.required_password.value,
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
              <Label>{content.sign_in.password_label.value}</Label>
              <Input placeholder={content.sign_in.password_placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" intent="primary" isDisabled={mutation.isPending}>
          {content.sign_in.submit.value}
        </Button>
      </Form>

      <div className="flex flex-col gap-2">
        <Button intent="outline" className="gap-2" onPress={() => setState("forgot-password")}>
          <EnvelopeSimpleIcon size={18} weight="light" />
          {content.sign_in.forgot_password.value}
        </Button>
        <Button intent="outline" className="gap-2" onPress={() => setState("sign-up")}>
          <UserPlusIcon size={18} weight="light" />
          {content.sign_in.create_account.value}
        </Button>
      </div>

      <div className="relative my-2 flex items-center justify-center text-sm">
        <div className="absolute inset-0 flex items-center">
          <div className="bg-border h-px w-full shrink-0"></div>
        </div>
        <span className="bg-bg relative px-3">{content.sign_in.or_continue.value}</span>
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
  const content = useIntlayer("auth");
  return (
    <Button
      intent="outline"
      className="gap-2"
      isDisabled={isPending}
      onPress={() => {
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "discord",
          });
        });
      }}
    >
      <DiscordLogoIcon size={18} weight="light" />
      {content.sign_in.sign_in_discord.value}
    </Button>
  );
}

function SignInWithTwitter() {
  const [isPending, startTransition] = useTransition();
  const content = useIntlayer("auth");
  return (
    <Button
      intent="outline"
      className="gap-2"
      isDisabled={isPending}
      onPress={() => {
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "twitter",
          });
        });
      }}
    >
      <XLogoIcon size={18} weight="light" />
      {content.sign_in.sign_in_twitter.value}
    </Button>
  );
}

function SignUpForm({
  setState,
}: {
  setState: (state: "sign-in" | "sign-up" | "forgot-password") => void;
}) {
  const router = useRouter();
  const content = useIntlayer("auth");
  const commonContent = useIntlayer("common");
  const { handleSubmit, control } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string }) => {
      const result = await authClient.signUp.email(data);
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: async (_, _v, _o, { client }) => {
      toast.success(content.sign_up.success.value);
      void client.invalidateQueries({
        queryKey: ["session"],
      });
      router.push("/");
    },
    onError: (err) => {
      toast.error(content.sign_up.error({ message: err.message }).value);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({ email: data.email, password: data.password, name: data.name });
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="name"
          rules={{
            required: commonContent.validation.required_name.value,
          }}
          render={({
            field: { name, value, onChange, onBlur },
            fieldState: { invalid, error },
          }) => (
            <TextField
              type="text"
              name={name}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              isRequired
              isInvalid={invalid}
              validationBehavior="aria"
            >
              <Label>{content.sign_up.name_label.value}</Label>
              <Input placeholder={content.sign_up.name_placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="email"
          rules={{
            required: commonContent.validation.required_email.value,
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
              <Label>{content.sign_up.email_label.value}</Label>
              <Input placeholder={content.sign_up.email_placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: commonContent.validation.required_password.value,
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
              <Label>{content.sign_up.password_label.value}</Label>
              <Input />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          {content.sign_up.submit.value}
        </Button>
        <Button intent="outline" onPress={() => setState("sign-in")}>
          {content.sign_up.back.value}
        </Button>
      </div>
    </Form>
  );
}

function ForgotPassword({
  setState,
}: {
  setState: (state: "sign-in" | "sign-up" | "forgot-password") => void;
}) {
  const content = useIntlayer("auth");
  const commonContent = useIntlayer("common");
  const { handleSubmit, control } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success(content.forgot_password.success.value);
      setState("sign-in");
    },
    onError: (err) => {
      toast.error(content.forgot_password.error({ message: err.message }).value);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data.email);
  });

  return (
    <Form onSubmit={onSubmit} validationBehavior="aria">
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="email"
          rules={{
            required: commonContent.validation.required_email.value,
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
              <Label>{content.forgot_password.email_label.value}</Label>
              <Input placeholder={content.forgot_password.email_placeholder.value} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          {content.forgot_password.submit.value}
        </Button>
        <Button intent="outline" onPress={() => setState("sign-in")}>
          {content.forgot_password.back.value}
        </Button>
      </div>
    </Form>
  );
}
