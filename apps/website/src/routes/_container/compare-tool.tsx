import { HeartBreakIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import CompareView from "@/components/compare/compare-view";
import { ListProvider } from "@/hooks/use-list-target";
import { compareInputSchema } from "@/lib/compare/schemas";
import { client } from "@/lib/orpc/client";
import { getListBySlug } from "@/lib/server/functions/list.server";

const compareSearchSchema = z.object({
  sourceId: z.string().optional(),
  targetType: z.enum(["profile", "list"]).optional(),
  targetProfile: z.string().optional(),
  targetListId: z.string().optional(),
  mode: z.enum(["missing", "matches"]).optional(),
});

type CompareLoaderResult =
  | {
      ok: true;
      input: z.infer<typeof compareInputSchema>;
      list: Awaited<ReturnType<typeof getListBySlug>>;
      compareResult: unknown;
    }
  | { ok: false; error: string };

export const Route = createFileRoute("/_container/compare-tool")({
  validateSearch: compareSearchSchema,
  loaderDeps: ({ search }) => {
    return search;
  },
  loader: async ({ deps }) => {
    const parseResult = compareInputSchema.safeParse(deps);
    if (!parseResult.success) {
      return { ok: false, error: "Invalid params" } satisfies CompareLoaderResult;
    }

    const input = parseResult.data;
    const list = await getListBySlug({ data: { slug: input.sourceId } });

    try {
      const compareResult = await client.compare.compare(input);
      return { ok: true, input, list, compareResult } satisfies CompareLoaderResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Compare failed";
      return { ok: false, error: message } satisfies CompareLoaderResult;
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData || !loaderData.ok) {
      return { meta: [{ title: "Compare Tool · Objekt Tracker" }] };
    }
    const source = loaderData.input.sourceId;
    const target = loaderData.input.targetProfile ?? loaderData.input.targetListId ?? "";
    return { meta: [{ title: `Compare ${source} vs ${target} · Objekt Tracker` }] };
  },
  component: CompareToolPage,
});

function CompareToolPage() {
  const data = Route.useLoaderData();

  if (!data.ok) {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <HeartBreakIcon size={64} weight="light" />
        <span className="font-medium">{data.error}</span>
      </div>
    );
  }

  return (
    <ListProvider list={data.list}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <CompareView input={data.input} />
      </div>
    </ListProvider>
  );
}
