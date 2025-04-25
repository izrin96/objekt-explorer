import { cn } from "@/utils/classes";

export function GroupLabelRender({ title }: { title: string }) {
  return (
    <div
      className={cn("font-semibold text-base pb-3 pt-3", !title && "hidden")}
    >
      {title}
    </div>
  );
}
