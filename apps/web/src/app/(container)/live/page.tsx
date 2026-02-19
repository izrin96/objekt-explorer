import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import LiveSessionListRender from "@/components/live/session-list";
import { Loader } from "@/components/ui/loader";
import { Note } from "@/components/ui/note";
import { env } from "@/env";

type Props = {
  searchParams?: Promise<{
    token?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("page_titles");
  return {
    title: t("live"),
  };
}

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const token = searchParams?.token ?? "";
  return (
    <div className="flex flex-col gap-3 pt-2 pb-36">
      <Note>
        As this feature violates Cosmo&apos;s Terms of Service, we will no longer continue offering
        it. Please watch the live stream on the Cosmo app instead.
      </Note>
      {token === env.BYPASS_LIVE_KEY && (
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Loader variant="ring" />
            </div>
          }
        >
          <LiveSessionListRender />
        </Suspense>
      )}
    </div>
  );
}
