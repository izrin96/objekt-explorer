import { CircleHelp } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12 font-semibold">
      <CircleHelp className="size-12" strokeWidth={1.8} />
      Page not found
    </div>
  );
}
