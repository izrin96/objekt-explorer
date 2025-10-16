import { getTranslations } from "next-intl/server";
import ResetPassword from "@/components/auth/reset-password";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token: string }>;
}) {
  const t = await getTranslations("auth.reset_password");
  const { token } = await searchParams;
  if (!token) {
    return <div>{t("invalid_token")}</div>;
  }
  return <ResetPassword token={token} />;
}
