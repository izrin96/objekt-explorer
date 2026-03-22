import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/")({
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <div>Home</div>
    </div>
  );
}
