import { Loader } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12">
      <Loader variant="ring" />
    </div>
  );
}
