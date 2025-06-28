import { Loader } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2">
      <Loader variant="ring" />
    </div>
  );
}
