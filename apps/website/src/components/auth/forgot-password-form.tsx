import { useMutation } from "@tanstack/react-query";
import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { FieldError, Label } from "../intentui/field";
import { Input } from "../intentui/input";
import { TextField } from "../intentui/text-field";

export function ForgotPassword({
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
      toast.success(m.auth_forgot_password_success());
      setState("sign-in");
    },
    onError: (err) => {
      toast.error(m.auth_forgot_password_error({ message: err.message }));
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
              <Label>{m.auth_forgot_password_email_label()}</Label>
              <Input placeholder={m.auth_forgot_password_email_placeholder()} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isPending={mutation.isPending}>
          {m.auth_forgot_password_submit()}
        </Button>
        <Button intent="outline" onPress={() => setState("sign-in")}>
          {m.auth_forgot_password_back()}
        </Button>
      </div>
    </Form>
  );
}
