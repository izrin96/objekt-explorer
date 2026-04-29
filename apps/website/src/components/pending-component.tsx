import { Loader } from "./intentui/loader";

export function PendingComponent() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2">
      <Loader variant="ring" />
    </div>
  );
}
