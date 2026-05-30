import { RectangleDashedIcon } from "@phosphor-icons/react/dist/ssr";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { useProfileTarget } from "@/hooks/use-profile-target";
import { orpc } from "@/lib/orpc/client";
import { getListLinkOption } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Link } from "../intentui/link";
import { Loader } from "../intentui/loader";
import { ListTypeBadge } from "../shared/list-type-badge";

export default function ProfileLists() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center">
          <Loader variant="ring" />
        </div>
      }
    >
      <ProfileList />
    </Suspense>
  );
}

function ProfileList() {
  const profile = useProfileTarget()!;
  const { data } = useSuspenseQuery(
    orpc.list.profileLists.queryOptions({
      input: { profileAddress: profile.address },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <RectangleDashedIcon size={64} weight="light" />
          <span className="text-sm">{m.list_no_lists_found()}</span>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-2">
          {data.map((list) => {
            return (
              <Link
                key={list.slug}
                {...getListLinkOption(list)}
                className="hover:bg-muted flex flex-col gap-3 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{list.name}</h3>
                  {list.listTypeNew !== "general" && <ListTypeBadge type={list.listTypeNew} />}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
