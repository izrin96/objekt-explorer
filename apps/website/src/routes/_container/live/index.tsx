import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";

import { Loader } from "@/components/intentui/loader";
import { Note } from "@/components/intentui/note";
import LiveSessionListRender from "@/components/live/session-list";
import { serverEnv } from "@/lib/env/server";

const liveSearchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/_container/live/")({
  validateSearch: liveSearchSchema,
  head: () => ({
    meta: [{ title: "Live · Objekt Tracker" }],
  }),
  component: LivePage,
});

function LivePage() {
  const { token } = Route.useSearch();

  return (
    <div className="flex flex-col gap-3 pt-2 pb-36">
      <Note>
        As this feature violates Cosmo&apos;s Terms of Service, we will no longer continue offering
        it. Please watch the live stream on the Cosmo app instead.
      </Note>
      {/* todo: move to serverFn */}
      {token === serverEnv.BYPASS_LIVE_KEY && (
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
