"use client";

import {
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
  XLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "../ui/button";
import { FieldError, Label } from "../ui/field";
import { Form } from "../ui/form";
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
    onSuccess: (_, _v, _o, { client }) => {
      toast.success("Signed in successfully");
      client.refetchQueries({
        queryKey: ["session"],
      });
      router.push("/");
    },
    onError: (error) => {
      toast.error(`Sign in error. ${error.message}`);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({ email: data.email, password: data.password });
  });

  return (
    <>
      <div className="flex flex-col">
        <h2 className="font-semibold text-lg/8">Sign In</h2>
        <span className="text-muted-fg text-sm">
          Please enter your credentials to access your account.
        </span>
      </div>
      <Form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Controller
          control={control}
          name="email"
          rules={{
            required: "Email is required.",
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
              <Label>Email</Label>
              <Input placeholder="your@email.com" />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: "Password is required.",
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
              <Label>Password</Label>
              <Input placeholder="•••••••" />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" intent="primary" isDisabled={mutation.isPending}>
          Sign in with Email
        </Button>
      </Form>

      <div className="flex flex-col gap-2">
        <Button intent="outline" className="gap-2" onClick={() => setState("forgot-password")}>
          <EnvelopeSimpleIcon size={18} weight="light" />
          Forgot password
        </Button>
        <Button intent="outline" className="gap-2" onClick={() => setState("sign-up")}>
          <UserPlusIcon size={18} weight="light" />
          Create new account
        </Button>
      </div>

      <div className="relative my-2 flex items-center justify-center text-sm">
        <div className="absolute inset-0 flex items-center">
          <div className="h-px w-full shrink-0 bg-border"></div>
        </div>
        <span className="relative bg-bg px-3">Or continue with</span>
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
      isDisabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "discord",
          });
        });
      }}
    >
      <DiscordLogoIcon size={18} weight="light" />
      Sign in with Discord
    </Button>
  );
}

function SignInWithTwitter() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      intent="outline"
      className="gap-2"
      isDisabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await authClient.signIn.social({
            provider: "twitter",
          });
        });
      }}
    >
      <XLogoIcon size={18} weight="light" />
      Sign in with Twitter (X)
    </Button>
  );
}

function SignUpForm({
  setState,
}: {
  setState: (state: "sign-in" | "sign-up" | "forgot-password") => void;
}) {
  const router = useRouter();
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
    onSuccess: (_, _v, _o, { client }) => {
      toast.success("Account created successfully.");
      client.refetchQueries({
        queryKey: ["session"],
      });
      router.push("/");
    },
    onError: (error) => {
      toast.error(`Account creation error. ${error.message}`);
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
            required: "Name is required.",
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
              <Label>Name</Label>
              <Input placeholder="Your name" />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="email"
          rules={{
            required: "Email is required.",
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
              <Label>Email</Label>
              <Input placeholder="your@email.com" />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{
            required: "Password is required.",
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
              <Label>Password</Label>
              <Input />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          Create Account
        </Button>
        <Button intent="outline" onClick={() => setState("sign-in")}>
          Back to Sign In
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
  const { handleSubmit, control } = useForm({
    defaultValues: {
      email: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await authClient.forgetPassword({
        email,
        redirectTo: "/auth/reset-password",
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Reset password email sent, check your email");
      setState("sign-in");
    },
    onError: (error) => {
      toast.error(`Reset password email request error. ${error.message}`);
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
            required: "Email is required.",
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
              <Label>Email</Label>
              <Input placeholder="your@email.com" />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          Send reset password email
        </Button>
        <Button intent="outline" onClick={() => setState("sign-in")}>
          Back to Sign In
        </Button>
      </div>
    </Form>
  );
}
