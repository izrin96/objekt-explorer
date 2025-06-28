import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr";

export default async function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <SealCheckIcon size={64} weight="light" />
      <p>Email has been verified</p>
    </div>
  );
}
