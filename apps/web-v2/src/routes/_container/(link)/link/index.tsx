import { createFileRoute } from "@tanstack/react-router";
import MyLinkRender from "@/components/link/my-link";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/(link)/link/")({
  component: RouteComponent,
  head: () => ({
    meta: seo({ title: "My Cosmo link" }),
  }),
});

function RouteComponent() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="font-semibold text-xl">My Cosmo</div>
        <MyLinkRender />
      </div>
    </div>
  );
}
