import type { Metadata } from "next";
import ActivityRender from "@/components/activity/activity-render";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Activity",
  };
}

export default function Page() {
  return <ActivityRender />;
}
