import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

export const Route = createFileRoute("/(container)/auth/verified")({
  component: VerifiedPage,
});

function VerifiedPage() {
  const content = useIntlayer("auth");
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <SealCheckIcon size={64} weight="light" />
      <span>{content.verified.email_verified.value}</span>
    </div>
  );
}
