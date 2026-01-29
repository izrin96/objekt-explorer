"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Form } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "../ui/button";
import { FieldError, Label } from "../ui/field";
import { TextField } from "../ui/text-field";

export default function ResetPassword({ token }: { token: string }) {
  const router = useRouter();

  const { handleSubmit, control } = useForm({
    defaultValues: {
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
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

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      password: data.password,
    });
  });

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex w-full max-w-xl flex-col gap-4 self-center">
        <div className="text-xl font-semibold">Reset Password</div>
        <Form onSubmit={onSubmit}>
          <div className="flex flex-col gap-4">
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
                  isRequired
                  type="password"
                  name={name}
                  value={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  isInvalid={invalid}
                >
                  <Label>Password</Label>
                  <FieldError>{error?.message}</FieldError>
                </TextField>
              )}
            />
            <Button type="submit" isDisabled={mutation.isPending}>
              Reset Password
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
