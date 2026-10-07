import { PageMain } from "@/components/layout/page-main";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";

/** Says a route's skeleton is loading, for a screen reader that cannot see it. */
export function PendingStatus() {
  return (
    <span role="status" className="sr-only">
      {m.status_loading()}
    </span>
  );
}

export function PendingComponent() {
  return (
    <PageMain>
      <div className="flex w-full justify-center py-12">
        <Spinner aria-label={m.status_loading()} className="text-muted-foreground size-6" />
      </div>
    </PageMain>
  );
}
