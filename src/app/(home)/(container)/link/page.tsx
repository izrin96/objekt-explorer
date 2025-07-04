import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import MyLinkRender from "@/components/link/my-link";
import { cachedSession } from "@/lib/server/auth";
import { api, HydrateClient } from "@/lib/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "My Cosmo Link",
  };
}

export default async function Page() {
  const t = await getTranslations("link");
  const session = await cachedSession();

  if (!session) redirect("/");

  api.profile.list.prefetch();

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="font-semibold text-xl">{t("my_cosmo")}</div>
        <HydrateClient>
          <MyLinkRender />
        </HydrateClient>
      </div>
    </div>
  );
}
