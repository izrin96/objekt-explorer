import LiveSessionList from "@/components/live/session-list";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live",
  };
}

export default async function Page() {
  return (
    <div className="flex flex-col pb-36 pt-2">
      <LiveSessionList />
    </div>
  );
}
