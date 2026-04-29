import { createFileRoute } from "@tanstack/react-router";

import IndexRender from "@/components/index/index-view";

export const Route = createFileRoute("/(container)/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <IndexRender />
    </div>
  );
}
