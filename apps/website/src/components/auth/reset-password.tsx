import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { FieldError, Label } from "../intentui/field";
import { Input } from "../intentui/input";
import { TextField } from "../intentui/text-field";

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
      toast.success(m.auth_reset_password_success());
      void router.navigate({ to: "/login" });
    },
    onError: ({ message }) => {
      toast.error(m.auth_reset_password_error({ message }));
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate({
      password: data.password,
    });
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <h2 className="font-display text-xl font-semibold">{m.auth_reset_password_title()}</h2>
      <Form onSubmit={onSubmit} validationBehavior="aria">
        <div className="flex flex-col gap-4">
          <Controller
            control={control}
            name="password"
            rules={{
              required: m.auth_reset_password_password_required(),
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
                <Label>{m.auth_reset_password_password_label()}</Label>
                <Input placeholder={m.auth_reset_password_password_placeholder()} />
                <FieldError>{error?.message}</FieldError>
              </TextField>
            )}
          />
          <Button type="submit" isPending={mutation.isPending}>
            {m.auth_reset_password_submit()}
          </Button>
        </div>
      </Form>
    </div>
  );
}
