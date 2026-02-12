import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
  const profile = await getUserByIdentifier(params.nickname, session?.user.id);
  const queryClient = getQueryClient();

  // Fetch lists for this profile
  const lists = await queryClient.ensureQueryData(
    orpc.list.profileLists.queryOptions({
      input: { profileAddress: profile.address },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Lists</h2>
      </div>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-muted-fg">No lists found for this profile</p>
          {profile.isOwned && (
            <p className="text-muted-fg text-sm">
              Create a profile list or set a normal list to display in this profile
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const isProfileList = list.listType === "profile";
            const href = getListHref(list);

            return (
              <Link
                key={list.slug}
                href={href}
                className="hover:bg-muted flex flex-col gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{list.name}</h3>
                  <Badge intent={isProfileList ? "primary" : "secondary"} className="text-xs">
                    {isProfileList ? "Profile" : "Normal"}
                  </Badge>
                </div>
                <p className="text-muted-fg text-sm">
                  {isProfileList
                    ? `Shows objekts owned by ${profile.nickname || profile.address}`
                    : "Collection-based list"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
