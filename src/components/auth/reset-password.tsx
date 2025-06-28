"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button, Form, TextField } from "../ui";

export default function ResetPassword({ token }: { token: string }) {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async ({ password, token }: { password: string; token: string }) => {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      router.push("/login");
    },
    onError: ({ message }) => {
      toast.error(`Password reset error. ${message}`);
    },
  });

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex w-full max-w-xl flex-col gap-4 self-center">
        <div className="font-semibold text-xl">Reset Password</div>
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const password = formData.get("password") as string;
            mutation.mutate({ password, token });
          }}
        >
          <div className="flex flex-col gap-4">
            <TextField label="Password" type="password" name="password" isRequired />
            <Button type="submit" isDisabled={mutation.isPending}>
              Reset Password
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
