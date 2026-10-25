import { createFileRoute } from "@tanstack/react-router";

import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/mod/reports/")({
  head: () => generateMetadata({ title: m.page_titles_mod_reports() }),
  component: PickAccount,
});

// below `lg` the queue is the whole page, so the prompt has nothing to point at
function PickAccount() {
  return (
    <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm text-pretty max-xl:hidden xl:col-span-2">
      {m.mod_pick_account()}
    </p>
  );
}
