"use client";

import { useState, useTransition } from "react";
import { Button, Form, Note, TextField } from "../ui";
import { authClient } from "@/lib/auth-client";
import {
  DiscordLogoIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SignIn() {
  const [state, setState] = useState<"sign-in" | "sign-up" | "forgot-password">(
    "sign-in"
  );

  return (
    <div className="flex flex-col py-6 gap-6">
      <div className="flex flex-col gap-6 max-w-xl w-full self-center">
        <Note intent="default">
          If you previously signed in with Discord, you can still sign in with
          email and password, but you&apos;ll need to set your password using
          Forgot Password option.
        </Note>
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
  const [isPending, startTransition] = useTransition();
  const mutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const result = await authClient.signIn.email({
        email: email,
        password: password,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      router.push("/");
      toast.success("Signed in successfully");
    },
    onError: (error) => {
      toast.error(`Sign in error. ${error.message}`);
    },
  });

  return (
    <>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const email = formData.get("email") as string;
          const password = formData.get("password") as string;
          mutation.mutate({ email, password });
        }}
        className="flex flex-col gap-4"
      >
        <TextField
          label="Email"
          type="email"
          name="email"
          isRequired
          placeholder="your@email.com"
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          isRequired
          isRevealable
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          Sign in with Email
        </Button>
      </Form>

      <div className="flex flex-col gap-2">
        <Button
          intent="secondary"
          className="gap-2"
          onClick={() => setState("forgot-password")}
        >
          <EnvelopeSimpleIcon size={24} weight="light" />
          Forgot password
        </Button>
        <Button
          intent="secondary"
          className="gap-2"
          onClick={() => setState("sign-up")}
        >
          <UserPlusIcon size={24} weight="light" />
          Create new account
        </Button>
      </div>

      <div className="my-2 flex justify-center text-sm">
        <span>Or continue with</span>
      </div>

      <Button
        intent="primary"
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
        <DiscordLogoIcon size={24} weight="light" />
        Sign in with Discord
      </Button>
    </>
  );
}

function SignUpForm({
  setState,
}: {
  setState: (state: "sign-in" | "sign-up" | "forgot-password") => void;
}) {
  const mutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      name: string;
    }) => {
      const result = await authClient.signUp.email({
        ...data,
        callbackURL: "/auth/verified",
      });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Account created successfully. Please confirm your email.");
      setState("sign-in");
    },
    onError: (error) => {
      toast.error(`Account creation error. ${error.message}`);
    },
  });

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const name = formData.get("name") as string;
        mutation.mutate({ email, password, name });
      }}
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Name"
          type="text"
          name="name"
          isRequired
          placeholder="Your name"
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          isRequired
          placeholder="your@email.com"
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          isRequired
          isRevealable
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          Create Account
        </Button>
        <Button intent="secondary" onClick={() => setState("sign-in")}>
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

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        mutation.mutate(email);
      }}
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="Email"
          type="email"
          name="email"
          isRequired
          placeholder="your@email.com"
        />
        <Button type="submit" isDisabled={mutation.isPending}>
          Send reset password email
        </Button>
        <Button intent="secondary" onClick={() => setState("sign-in")}>
          Back to Sign In
        </Button>
      </div>
    </Form>
  );
}
