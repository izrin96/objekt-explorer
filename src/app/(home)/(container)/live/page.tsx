import { Note } from "@/components/ui";
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
      <Note>
        As this feature violates Cosmo's Terms of Service, we will no longer
        continue offering it. Please watch the live stream on the Cosmo app
        instead.
      </Note>
      {/* <LiveSessionList /> */}
    </div>
  );
}
