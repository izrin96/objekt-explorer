import { createFileRoute, redirect } from "@tanstack/react-router";

import MyLinkRender from "@/components/link/my-link";
import { useTranslations } from "@/lib/i18n/context";
import { getSession } from "@/lib/server/auth";

export const Route = createFileRoute("/_container/link/")({
  head: () => ({
    meta: [{ title: "My Cosmo Link · Objekt Tracker" }],
  }),
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
  },
  component: LinkPage,
});

function LinkPage() {
  const t = useTranslations("link");

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">{t("my_cosmo")}</div>
        <MyLinkRender />
      </div>
    </div>
  );
}
