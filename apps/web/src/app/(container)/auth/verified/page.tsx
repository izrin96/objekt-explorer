import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.verified");
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <SealCheckIcon size={64} weight="light" />
      <p>{t("email_verified")}</p>
    </div>
  );
}
