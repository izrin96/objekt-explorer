import { useIntlayer } from "next-intlayer/server";

import ResetPassword from "@/components/auth/reset-password";

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/auth/reset-password">) {
  const content = useIntlayer("auth");
  const { token } = await searchParams;
  if (!token) {
    return <div>{content.reset_password.invalid_token.value}</div>;
  }
  return <ResetPassword token={token as string} />;
}
