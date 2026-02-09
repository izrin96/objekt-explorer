"use client";

import {
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.sign_in");

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
      toast.success(t("success"));
      void client.refetchQueries({
        queryKey: ["session"],
      });
      router.push("/");
    },
    onError: (error) => {
      toast.error(t("error", { message: error.message }));
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({ email: data.email, password: data.password });
  });

  return (
    <>
      <div className="flex flex-col">
        <h2 className="text-lg/8 font-semibold">{t("title")}</h2>
        <span className="text-muted-fg text-sm">{t("description")}</span>
      </div>
      <Form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Controller
          control={control}
          name="email"
          rules={{
            required: t("email_required"),
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
            >
              <Label>{t("email_label")}</Label>
              <Input placeholder={t("email_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: t("password_required"),
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
            >
              <Label>{t("password_label")}</Label>
              <Input placeholder={t("password_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" intent="primary" isDisabled={mutation.isPending}>
          {t("submit")}
        </Button>
      </Form>

      <div className="flex flex-col gap-2">
        <Button intent="outline" className="gap-2" onPress={() => setState("forgot-password")}>
          <EnvelopeSimpleIcon size={18} weight="light" />
          {t("forgot_password")}
        </Button>
        <Button intent="outline" className="gap-2" onPress={() => setState("sign-up")}>
          <UserPlusIcon size={18} weight="light" />
          {t("create_account")}
        </Button>
      </div>

      <div className="relative my-2 flex items-center justify-center text-sm">
        <div className="absolute inset-0 flex items-center">
          <div className="bg-border h-px w-full shrink-0"></div>
        </div>
        <span className="bg-bg relative px-3">{t("or_continue")}</span>
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
  const t = useTranslations("auth.sign_in");
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
      {t("sign_in_discord")}
    </Button>
  );
}

function SignInWithTwitter() {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("auth.sign_in");
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
      {t("sign_in_twitter")}
    </Button>
  );
}

function SignUpForm({
  setState,
}: {
  setState: (state: "sign-in" | "sign-up" | "forgot-password") => void;
}) {
  const router = useRouter();
  const t = useTranslations("auth.sign_up");
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
      toast.success(t("success"));
      void client.refetchQueries({
        queryKey: ["session"],
      });
      router.push("/");
    },
    onError: (error) => {
      toast.error(t("error", { message: error.message }));
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({ email: data.email, password: data.password, name: data.name });
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="name"
          rules={{
            required: t("name_required"),
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
            >
              <Label>{t("name_label")}</Label>
              <Input placeholder={t("name_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="email"
          rules={{
            required: t("email_required"),
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
            >
              <Label>{t("email_label")}</Label>
              <Input placeholder={t("email_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: t("password_required"),
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
            >
              <Label>{t("password_label")}</Label>
              <Input />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          {t("submit")}
        </Button>
        <Button intent="outline" onPress={() => setState("sign-in")}>
          {t("back")}
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
  const t = useTranslations("auth.forgot_password");
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
      toast.success(t("success"));
      setState("sign-in");
    },
    onError: (error) => {
      toast.error(t("error", { message: error.message }));
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data.email);
  });

  return (
    <Form onSubmit={onSubmit}>
      <div className="flex flex-col gap-4">
        <Controller
          control={control}
          name="email"
          rules={{
            required: t("email_required"),
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
            >
              <Label>{t("email_label")}</Label>
              <Input placeholder={t("email_placeholder")} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          {t("submit")}
        </Button>
        <Button intent="outline" onPress={() => setState("sign-in")}>
          {t("back")}
        </Button>
      </div>
    </Form>
  );
}
