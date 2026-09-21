import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";

export function PendingComponent() {
  return (
    <div className="flex w-full justify-center py-12">
      <Spinner aria-label={m.status_loading()} className="text-muted-foreground size-6" />
    </div>
  );
}
