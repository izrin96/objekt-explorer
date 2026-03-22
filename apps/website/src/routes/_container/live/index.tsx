import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";

import LiveSessionListRender from "@/components/live/session-list";
import { Loader } from "@/components/ui/loader";
import { Note } from "@/components/ui/note";

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
      {token && (
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
