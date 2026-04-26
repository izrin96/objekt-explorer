import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import * as z from "zod";

import { Loader } from "@/components/intentui/loader";
import { Note } from "@/components/intentui/note";
import LiveSessionListRender from "@/components/live/session-list";
import { checkAccess } from "@/lib/functions/live";

const liveSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/(container)/live/")({
  validateSearch: liveSearchSchema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    const isAllowed = await checkAccess({ data: { token: deps.token } });
    return {
      isAllowed,
    };
  },
  head: () => ({
    meta: [{ title: "Live · Objekt Tracker" }],
  }),
  component: LivePage,
});

function LivePage() {
  const { isAllowed } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-3 pt-2 pb-36">
      <Note>
        As this feature violates Cosmo&apos;s Terms of Service, we will no longer continue offering
        it. Please watch the live stream on the Cosmo app instead.
      </Note>
      {isAllowed && (
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
