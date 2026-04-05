import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";

import CompareView from "@/components/compare/compare-view";
import { ProfileProvider } from "@/components/profile-provider";
import { compareInputSchema } from "@/lib/compare/schemas";
import { getList } from "@/lib/data-fetching";
import { orpc, safeClient } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";
import type { PublicList } from "@/lib/universal/user";

interface CompareToolPageProps {
  searchParams: Promise<{
    sourceId?: string;
    targetType?: string;
    targetProfile?: string;
    targetListId?: string;
    mode?: string;
  }>;
}

export async function generateMetadata(props: CompareToolPageProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const content = useIntlayer("page_titles");

  const sourceId = searchParams.sourceId ?? "";
  const targetId = searchParams.targetProfile ?? searchParams.targetListId ?? "";

  return {
    title: content.compare_tool({ source: sourceId, target: targetId }).value,
  };
}

export default async function CompareToolPage(props: CompareToolPageProps) {
  const queryClient = getQueryClient();
  const [searchParams, session] = await Promise.all([props.searchParams, getSession()]);

  const parseResult = compareInputSchema.safeParse(searchParams);

  if (!parseResult.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <HeartBreakIcon size={64} weight="light" />
        <span className="font-medium">Invalid parameters</span>
      </div>
    );
  }

  const input = parseResult.data;
  const result = await getList(input.sourceId);

  const { ownerId, ...safeList } = result;
  const list: PublicList = {
    ...safeList,
    isOwned: ownerId && session?.user.id ? ownerId === session.user.id : false,
  };

  const [error, data] = await safeClient.compare.compare(input);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <HeartBreakIcon size={64} weight="light" />
        <span className="font-medium">{error.message}</span>
      </div>
    );
  }

  queryClient.setQueryData(orpc.compare.compare.queryKey({ input }), data);

  return (
    <ProfileProvider targetList={list}>
      <HydrateClient client={queryClient}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <CompareView input={input} />
        </div>
      </HydrateClient>
    </ProfileProvider>
  );
}
