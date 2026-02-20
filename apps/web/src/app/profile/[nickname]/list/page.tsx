import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { getUserByIdentifier } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";
import { getListHref } from "@/lib/utils";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export default async function ProfileListsPage(props: Props) {
  const [params, session] = await Promise.all([props.params, getSession()]);
  const profile = await getUserByIdentifier(params.nickname);
  const queryClient = getQueryClient();
  const t = await getTranslations("list");
  profile.isOwned =
    profile.ownerId && session?.user.id ? profile.ownerId === session.user.id : false;

  // Fetch lists for this profile
  const lists = await queryClient.ensureQueryData(
    orpc.list.profileLists.queryOptions({
      input: { profileAddress: profile.address },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-muted-fg">{t("no_lists_found")}</p>
          {profile.isOwned && <p className="text-muted-fg text-sm">{t("no_lists_hint")}</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const href = getListHref(list);

            return (
              <Link
                key={list.slug}
                href={href}
                className="hover:bg-muted flex flex-col gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{list.name}</h3>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
