import { createFileRoute } from "@tanstack/react-router";
import IndexRender from "@/components/index/index-view";
import { UserProvider } from "@/hooks/use-user";

export const Route = createFileRoute("/_container/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <UserProvider>
        <IndexRender />
      </UserProvider>
    </div>
  );
}
