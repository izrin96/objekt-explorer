import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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

export function SignUpForm({
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
    onSuccess: async (_, _v, _o, { client }) => {
      toast.success(m.auth_sign_up_success());
      void client.invalidateQueries({
        queryKey: orpc.user.currentUser.key(),
      });
      void router.navigate({ to: "/" });
    },
    onError: (err) => {
      toast.error(m.auth_sign_up_error({ message: err.message }));
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
            required: m.common_validation_required_name(),
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
              <Label>{m.auth_sign_up_name_label()}</Label>
              <Input placeholder={m.auth_sign_up_name_placeholder()} />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
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
              <Label>{m.auth_sign_up_email_label()}</Label>
              <Input placeholder={m.auth_sign_up_email_placeholder()} />
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
              <Label>{m.auth_sign_up_password_label()}</Label>
              <Input />
              <FieldError>{error?.message}</FieldError>
            </TextField>
          )}
        />
        <Button type="submit" isPending={mutation.isPending}>
          {m.auth_sign_up_submit()}
        </Button>
        <Button intent="outline" onPress={() => setState("sign-in")}>
          {m.auth_sign_up_back()}
        </Button>
      </div>
    </Form>
  );
}
