import { useSuspenseQuery } from "@tanstack/react-query";
import { useIntlayer } from "react-intlayer";

import { useProfileTarget } from "@/hooks/use-profile-target";
import { orpc } from "@/lib/orpc/client";
import { getListHref } from "@/lib/utils";

import { Link } from "../intentui/link";

export default function ProfileLists() {
  const content = useIntlayer("list");
  const profile = useProfileTarget()!;
  const { data } = useSuspenseQuery(
    orpc.list.profileLists.queryOptions({
      input: { profileAddress: profile.address },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <span className="text-muted-fg text-sm">{content.no_lists_found.value}</span>
          {profile.isOwned && (
            <span className="text-muted-fg text-sm">{content.no_lists_hint.value}</span>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((list) => {
            const href = getListHref(list);

            return (
              <Link
                key={list.slug}
                to={href}
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
