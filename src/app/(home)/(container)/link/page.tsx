import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import MyLinkRender from "@/components/link/my-link";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { cachedSession } from "@/lib/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "My Cosmo Link",
  };
}

export default async function Page() {
  const queryClient = getQueryClient();
  const [session, t] = await Promise.all([cachedSession(), getTranslations("link")]);

  if (!session) redirect("/");

  queryClient.prefetchQuery(orpc.profile.list.queryOptions());

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="font-semibold text-xl">{t("my_cosmo")}</div>
        <HydrateClient client={queryClient}>
          <MyLinkRender />
        </HydrateClient>
      </div>
    </div>
  );
}
