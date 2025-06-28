import { redirect } from "next/navigation";
import LinkRender from "@/components/link/link-process";
import { cachedSession } from "@/lib/server/auth";

export default async function Page() {
  const session = await cachedSession();

  if (!session) redirect("/");

  return (
    <div className="flex flex-col pt-2 pb-36">
      <LinkRender />
    </div>
  );
}
