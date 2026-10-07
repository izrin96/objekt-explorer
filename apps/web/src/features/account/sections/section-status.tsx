import { Spinner } from "@/components/ui/spinner";

export function SectionStatus({ error }: { error: Error | null }) {
  if (error) {
    return <p className="text-destructive-foreground text-sm">{error.message}</p>;
  }

  return (
    <div className="flex justify-center py-4">
      <Spinner className="size-5" />
    </div>
  );
}
