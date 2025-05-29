import ActivityRender from "@/components/activity/activity-render";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Activity",
  };
}

export default function Page() {
  return <ActivityRender />;
}
