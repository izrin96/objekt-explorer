import { DELETE_REFUSALS } from "@repo/api/schemas/user";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

import { DangerPanel } from "@/features/account/panels";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/account/danger")({
  // set by the server when a deletion link is refused
  validateSearch: z.object({ refused: z.enum(DELETE_REFUSALS).optional().catch(undefined) }),
  head: () => generateMetadata({ title: m.auth_account_danger_zone() }),
  component: DangerRoute,
});

function DangerRoute() {
  const { refused } = Route.useSearch();
  return <DangerPanel refused={refused ?? null} />;
}
