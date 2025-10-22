import { createFileRoute } from "@tanstack/react-router";
import LinkRender from "@/components/link/link-process";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/(link)/link/connect/")({
  component: RouteComponent,
  head: () => ({
    meta: seo({ title: "Cosmo link" }),
  }),
});

function RouteComponent() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <LinkRender />
    </div>
  );
}
