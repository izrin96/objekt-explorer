import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";
import { redirect } from "next/navigation";

import MyLinkRender from "@/components/link/my-link";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const content = useIntlayer("page_titles");
  return {
    title: content.my_cosmo_link.value,
  };
}

export default async function Page() {
  const queryClient = getQueryClient();
  const session = await getSession();
  const content = useIntlayer("link");

  if (!session) redirect("/");

  void queryClient.prefetchQuery(orpc.profile.list.queryOptions());

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">{content.my_cosmo.value}</div>
        <HydrateClient client={queryClient}>
          <MyLinkRender />
        </HydrateClient>
      </div>
    </div>
  );
}
