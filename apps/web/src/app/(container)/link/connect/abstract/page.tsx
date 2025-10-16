import { redirect } from "next/navigation";
import AbstractProcess from "@/components/link/link-abstract";
import NextAbstractWalletProvider from "@/components/NextAbstractWalletProvider";
import { getSession } from "@/lib/server/auth";

export default async function Page() {
  const session = await getSession();

  if (!session) redirect("/");

  return (
    <div className="flex flex-col pt-2 pb-36">
      <NextAbstractWalletProvider>
        <AbstractProcess />
      </NextAbstractWalletProvider>
    </div>
  );
}
