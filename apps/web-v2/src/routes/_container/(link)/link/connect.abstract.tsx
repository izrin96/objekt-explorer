import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/(link)/link/connect/abstract")({
  component: RouteComponent,
  head: () => ({
    meta: seo({ title: "Cosmo link" }),
  }),
});

function RouteComponent() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="text-center text-sm">
        Abstract support temporary disabled to fix some issue.
      </div>
      {/* <AbstractPrivyProvider>
        <AbstractProcess />
      </AbstractPrivyProvider> */}
    </div>
  );
}
