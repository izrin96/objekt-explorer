"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useTarget } from "@/hooks/use-target";
import { orpc } from "@/lib/orpc/client";
import { getListHref } from "@/lib/utils";

import { Link } from "../ui/link";

export default function ProfileLists() {
  const t = useTranslations("list");
  const profile = useTarget((a) => a.profile)!;
  const { data } = useSuspenseQuery(
    orpc.list.profileLists.queryOptions({
      input: { profileAddress: profile.address },
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <p className="text-muted-fg text-sm">{t("no_lists_found")}</p>
          {profile.isOwned && <p className="text-muted-fg text-sm">{t("no_lists_hint")}</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((list) => {
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
