import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr";

export default async function ResetPasswordPage() {
  return (
    <div className="flex flex-col justify-center gap-3 items-center">
      <SealCheckIcon size={64} weight="light" />
      <p>Email has been verified</p>
    </div>
  );
}
