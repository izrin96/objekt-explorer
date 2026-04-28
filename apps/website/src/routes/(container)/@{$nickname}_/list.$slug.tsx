import { ImageBrokenIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer, useIntlayer } from "react-intlayer";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ListProvider } from "@/hooks/use-list-target";
import { ProfileProvider } from "@/hooks/use-profile-target";
import { getListBySlug } from "@/lib/functions/list";
import { getProfileByNickname } from "@/lib/functions/profile";
import { generateMetadata } from "@/lib/meta";

export const Route = createFileRoute("/(container)/@{$nickname}_/list/$slug")({
  loader: async ({ params }) => {
    const profile = await getProfileByNickname({ data: { nickname: params.nickname } });
    const list = await getListBySlug({
      data: { slug: params.slug, profileAddress: profile.address },
    });
    return { profile, list };
  },
  head: async ({ loaderData }) => {
    const content = getIntlayer("page_titles");
    return loaderData?.list
      ? generateMetadata({
          title: content.list_detail({ name: loaderData.list.name }).value,
        })
      : {};
  },
  component: ProfileListDetailPage,
  notFoundComponent: NotFoundComponent,
  ssr: false,
});

function ProfileListDetailPage() {
  const { profile, list } = Route.useLoaderData();

  return (
    <ProfileProvider profile={profile}>
      <ListProvider list={list}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ListHeader />
          <ListRender />
        </div>
      </ListProvider>
    </ProfileProvider>
  );
}

function NotFoundComponent() {
  const content = useIntlayer("not_found");
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <ImageBrokenIcon size={72} weight="thin" />
      {content.list.value}
    </div>
  );
}
