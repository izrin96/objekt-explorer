import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import LiveSessionListRender from "@/components/live/session-list";
import { Note } from "@/components/ui/note";
import { env } from "@/lib/env/server";
import { seo } from "@/lib/seo";

export const searchSchema = z.object({
  token: z.string().optional(),
});

export const fetchIsBypass = createServerFn({ method: "GET" })
  .inputValidator(searchSchema)
  .handler(({ data: { token } }) => {
    return token === env.BYPASS_LIVE_KEY;
  });

export const Route = createFileRoute("/_container/live/")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search: { token } }) => ({ token }),
  loader: async ({ deps }) => {
    const isBypass = await fetchIsBypass({ data: { token: deps.token } });
    return {
      isBypass,
    };
  },
  head: () => ({
    meta: seo({ title: "Live" }),
  }),
});

function RouteComponent() {
  const { isBypass } = Route.useLoaderData();

  return (
    <div className="flex flex-col gap-3 pt-2 pb-36">
      <Note>
        As this feature violates Cosmo&apos;s Terms of Service, we will no longer continue offering
        it. Please watch the live stream on the Cosmo app instead.
      </Note>
      {isBypass && <LiveSessionListRender />}
    </div>
  );
}
