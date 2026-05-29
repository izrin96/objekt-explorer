import { createFileRoute } from "@tanstack/react-router";

import IndexRender from "@/components/home/index-view";

export const Route = createFileRoute("/(container)/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col">
      <IndexRender />
    </div>
  );
}
