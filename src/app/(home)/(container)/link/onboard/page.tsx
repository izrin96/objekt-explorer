import { redirect } from "next/navigation";
import LinkRender from "@/components/link/link-process";
import NextAbstractWalletProvider from "@/components/NextAbstractWalletProvider";
import { getSession } from "@/lib/server/auth";

export default async function Page() {
  const session = await getSession();

  if (!session) redirect("/");

  return (
    <div className="flex flex-col pt-2 pb-36">
      <NextAbstractWalletProvider>
        <LinkRender />
      </NextAbstractWalletProvider>
    </div>
  );
}
