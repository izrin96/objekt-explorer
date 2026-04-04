import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer/server";

export default async function ResetPasswordPage() {
  const content = useIntlayer("auth");
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <SealCheckIcon size={64} weight="light" />
      <span>{content.verified.email_verified.value}</span>
    </div>
  );
}
