import { redirect } from "next/navigation";
import AbstractProcess from "@/components/link/link-abstract";
import NextAbstractWalletProvider from "@/components/NextAbstractWalletProvider";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient } from "@/lib/query/hydration";

export default async function Page() {
  const queryClient = getQueryClient();
  const session = await queryClient.ensureQueryData(orpc.session.queryOptions());

  if (!session) redirect("/");

  return (
    <div className="flex flex-col pt-2 pb-36">
      <NextAbstractWalletProvider>
        <AbstractProcess />
      </NextAbstractWalletProvider>
    </div>
  );
}
