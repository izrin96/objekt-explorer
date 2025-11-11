import type { Metadata } from "next";
import ProfileListHeader from "@/components/profile-list/list-header";
import ProfileListRender from "@/components/profile-list/list-view";
import { TargetProvider } from "@/hooks/use-target";
import { UserProvider } from "@/hooks/use-user";
import { getProfileList, getUserByIdentifier } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { fetchOwnedProfileLists } from "@/lib/server/api/routers/profile-list";
import { parseNickname } from "@/lib/utils";

type Props = {
  params: Promise<{
    slug: string;
    nickname: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);
  const data = await getProfileList(params.slug, profile.address);
  return {
    title: `${data.name} · ${parseNickname(data.address, data.nickname)}'s List`,
  };
}

export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([
    props.params,
    queryClient.ensureQueryData(orpc.session.queryOptions()),
  ]);

  const [profile] = await Promise.all([getUserByIdentifier(params.nickname)]);

  const [list, lists] = await Promise.all([
    getProfileList(params.slug, profile.address),
    session ? fetchOwnedProfileLists(session.user.id, profile.address) : undefined,
  ]);

  queryClient.prefetchQuery(
    orpc.profileList.listEntries.queryOptions({
      input: {
        slug: params.slug,
      },
    }),
  );

  queryClient.prefetchQuery(orpc.filterData.queryOptions());

  return (
    <UserProvider profileLists={lists}>
      <TargetProvider profileList={list}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ProfileListHeader />
          <HydrateClient client={queryClient}>
            <ProfileListRender />
          </HydrateClient>
        </div>
      </TargetProvider>
    </UserProvider>
  );
}
