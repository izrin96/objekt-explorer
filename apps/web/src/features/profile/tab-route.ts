import type { QueryClient } from "@tanstack/react-query";

import { displayNickname } from "@/lib/address";
import type { getProfile } from "@/lib/functions/profile";
import { generateMetadata } from "@/lib/meta";

import { profileQuery } from "./queries";

type Profile = Awaited<ReturnType<typeof getProfile>>;

/** A profile tab's loader: the profile the layout already read, from the cache. */
export const loadProfile = ({
  params,
  context: { queryClient },
}: {
  params: { nickname: string };
  context: { queryClient: QueryClient };
}) => queryClient.query({ ...profileQuery({ nickname: params.nickname }), staleTime: "static" });

/** A profile tab's `head`, its title naming the profile. */
export const profileTabHead =
  (title: (inputs: { nickname: string }) => string) =>
  ({ loaderData }: { loaderData?: Profile }) =>
    loaderData
      ? generateMetadata({
          title: title({ nickname: displayNickname(loaderData.address, loaderData.nickname) }),
        })
      : {};
