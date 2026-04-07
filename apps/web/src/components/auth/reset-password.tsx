"use client";

import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { useRouter } from "next/navigation";
import { Form } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

import { Button } from "../intentui/button";
import { FieldError, Label } from "../intentui/field";
import { TextField } from "../intentui/text-field";

export default function ResetPassword({ token }: { token: string }) {
  const router = useRouter();
  const content = useIntlayer("auth");

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
      toast.success(content.reset_password.success.value);
      router.push("/login");
    },
    onError: ({ message }) => {
      toast.error(content.reset_password.error({ message }).value);
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
        <div className="text-xl font-semibold">{content.reset_password.title.value}</div>
        <Form onSubmit={onSubmit} validationBehavior="aria">
          <div className="flex flex-col gap-4">
            <Controller
              control={control}
              name="password"
              rules={{
                required: content.reset_password.password_required.value,
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
                  validationBehavior="aria"
                >
                  <Label>{content.reset_password.password_label.value}</Label>
                  <FieldError>{error?.message}</FieldError>
                </TextField>
              )}
            />
            <Button type="submit" isDisabled={mutation.isPending}>
              {content.reset_password.submit.value}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
