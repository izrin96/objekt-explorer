import type { Metadata } from "next";
import { Note } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live",
  };
}

export default async function Page() {
  return (
    <div className="flex flex-col pt-2 pb-36">
      <Note>
        As this feature violates Cosmo&apos;s Terms of Service, we will no longer continue offering
        it. Please watch the live stream on the Cosmo app instead.
      </Note>
      {/* <LiveSessionList /> */}
    </div>
  );
}
